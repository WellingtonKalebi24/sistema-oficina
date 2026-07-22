import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createTenantWithAdmin, loginAs, resetIdentityTables } from "./testData.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep stock concurrency tests quiet while exercising the logger seam
  },
};

type ApiData<T> = {
  data: T;
};

type CategoryBody = {
  id: string;
};

type ProductBody = {
  availableQuantity: number;
  id: string;
  physicalQuantity: number;
  reservedQuantity: number;
};

type SupplierBody = {
  id: string;
};

beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;

  server = createServer(
    createApp({
      logStream,
      prisma,
    }),
  );

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not resolve test server address.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await resetIdentityTables(prisma);
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await prisma.$disconnect();
});

describe("stock concurrency contract", () => {
  it("D-05/D-10/STK-13 serializes concurrent exits so only available physical stock can be consumed", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Concorrencia Saidas",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const product = await createStockedProduct(headers, 5);

    const [firstExit, secondExit] = await Promise.all([
      createExit(headers, product.id, 4),
      createExit(headers, product.id, 4),
    ]);

    expect([firstExit.status, secondExit.status].sort()).toEqual([201, 409]);

    const productAfter = await readProduct(session.accessToken, product.id);
    expect(productAfter).toMatchObject({
      availableQuantity: 1,
      physicalQuantity: 1,
      reservedQuantity: 0,
    });
  });

  it("D-05/D-10/STK-13 keeps concurrent adjustments from producing a negative physical balance", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Concorrencia Ajustes",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const product = await createStockedProduct(headers, 3);

    const [firstAdjustment, secondAdjustment] = await Promise.all([
      createAdjustment(headers, product.id, -2),
      createAdjustment(headers, product.id, -2),
    ]);

    expect([firstAdjustment.status, secondAdjustment.status].sort()).toEqual([201, 409]);

    const productAfter = await readProduct(session.accessToken, product.id);
    expect(productAfter).toMatchObject({
      availableQuantity: 1,
      physicalQuantity: 1,
      reservedQuantity: 0,
    });
  });

  it("D-04/D-05/D-10/STK-13 serializes concurrent reservations so available stock cannot be over-reserved", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Concorrencia Reservas",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const product = await createStockedProduct(headers, 5);

    const [firstReservation, secondReservation, thirdReservation] = await Promise.all([
      createReservation(headers, product.id, 2),
      createReservation(headers, product.id, 2),
      createReservation(headers, product.id, 2),
    ]);

    expect([firstReservation.status, secondReservation.status, thirdReservation.status].sort()).toEqual([
      201, 201, 409,
    ]);

    const productAfter = await readProduct(session.accessToken, product.id);
    expect(productAfter).toMatchObject({
      availableQuantity: 1,
      physicalQuantity: 5,
      reservedQuantity: 4,
    });
  });
});

function bearerHeaders(accessToken: string): Record<string, string> {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    ...bearerHeaders(accessToken),
    "content-type": "application/json",
  };
}

async function createStockedProduct(
  headers: Record<string, string>,
  quantity: number,
): Promise<ProductBody> {
  const category = await createCategory(headers);
  const product = await createProduct(headers, category.id);
  const supplier = await createSupplier(headers);

  const purchaseResponse = await fetch(`${baseUrl}/stock/purchases`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity, unitCost: "10.00" }],
      purchasedAt: new Date("2026-07-22T12:00:00.000Z").toISOString(),
      supplierId: supplier.id,
    }),
  });

  expect(purchaseResponse.status).toBe(201);

  const authorization = headers.authorization;

  if (!authorization) {
    throw new Error("Missing authorization header in stock concurrency helper.");
  }

  return readProduct(authorization.replace("Bearer ", ""), product.id);
}

async function createCategory(headers: Record<string, string>): Promise<CategoryBody> {
  const response = await fetch(`${baseUrl}/stock/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `Categoria ${crypto.randomUUID()}`,
    }),
  });

  expect(response.status).toBe(201);

  const body = (await response.json()) as ApiData<CategoryBody>;
  return body.data;
}

async function createProduct(
  headers: Record<string, string>,
  categoryId: string,
): Promise<ProductBody> {
  const response = await fetch(`${baseUrl}/stock/products`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      categoryId,
      name: `Produto ${crypto.randomUUID()}`,
    }),
  });

  expect(response.status).toBe(201);

  const body = (await response.json()) as ApiData<ProductBody>;
  return body.data;
}

async function createSupplier(headers: Record<string, string>): Promise<SupplierBody> {
  const response = await fetch(`${baseUrl}/stock/suppliers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `Fornecedor ${crypto.randomUUID()}`,
    }),
  });

  expect(response.status).toBe(201);

  const body = (await response.json()) as ApiData<SupplierBody>;
  return body.data;
}

async function createExit(
  headers: Record<string, string>,
  productId: string,
  quantity: number,
): Promise<Response> {
  return fetch(`${baseUrl}/stock/exits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      origin: `OS ${crypto.randomUUID()}`,
      productId,
      quantity,
      sourceKind: "manual",
    }),
  });
}

async function createAdjustment(
  headers: Record<string, string>,
  productId: string,
  quantityDelta: number,
): Promise<Response> {
  return fetch(`${baseUrl}/stock/adjustments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      productId,
      quantityDelta,
      reason: `Conferencia ${crypto.randomUUID()}`,
      sourceKind: "inventory_count",
    }),
  });
}

async function createReservation(
  headers: Record<string, string>,
  productId: string,
  quantity: number,
): Promise<Response> {
  return fetch(`${baseUrl}/stock/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      productId,
      quantity,
      sourceKind: "quote",
      sourceReference: `ORC ${crypto.randomUUID()}`,
    }),
  });
}

async function readProduct(accessToken: string, productId: string): Promise<ProductBody> {
  const response = await fetch(`${baseUrl}/stock/products/${productId}`, {
    headers: bearerHeaders(accessToken),
  });

  expect(response.status).toBe(200);

  const body = (await response.json()) as ApiData<ProductBody>;
  return body.data;
}
