import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import {
  createCustomerFixture,
  createProductFixture,
  createReceptionCheckInFixture,
  createServiceCatalogFixture,
  createTenantWithAdmin,
  createVehicleFixture,
  getAuditRows,
  loginAs,
  resetIdentityTables,
} from "./testData.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep quote contract tests quiet while exercising the logger seam
  },
};

type ApiData<T> = {
  data: T;
};

type QuoteBody = {
  checkInId: string | null;
  customerId: string;
  diagnosis: {
    causa: string | null;
    problema: string | null;
    recomendacao: string | null;
  };
  discountWarning: {
    message: string | null;
    percent: string;
    triggered: boolean;
  };
  estimatedDeliveryAt: string | null;
  id: string;
  items: Array<{
    description: string;
    kind: "service" | "product";
    quantity: string;
    totalAmount: string;
  }>;
  publishReadiness: {
    canPublish: boolean;
    missing: string[];
  };
  sourceKind: "check_in" | "direct";
  status: "Rascunho";
  tenantId: string;
  totals: {
    discountAmount: string;
    subtotalAmount: string;
    surchargeAmount: string;
    totalAmount: string;
  };
  validUntil: string | null;
  vehicleId: string;
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

describe("quote draft API contract", () => {
  it("QTE-01/D-01 creates a diagnosis-backed draft quote from a tenant check-in", async () => {
    const fixture = await createTenantWithAdmin(prisma, { tenantName: "Oficina Orcamento" });
    const customer = await createCustomerFixture(prisma, fixture.tenantId, {
      name: "Cliente Orcamento",
    });
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId, {
      plateNormalized: "ORC0101",
    });
    const checkIn = await createReceptionCheckInFixture(
      prisma,
      fixture.tenantId,
      customer.customerId,
      vehicle.vehicleId,
    );
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);

    const response = await createQuote(authHeaders(session.accessToken), {
      checkInId: checkIn.id,
      customerId: customer.customerId,
      diagnosis: {
        causa: "Vazamento no retentor",
        problema: "Oleo vazando na parte inferior",
        recomendacao: "Substituir retentor e limpar area afetada",
      },
      validUntil: "2026-08-15T00:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as ApiData<QuoteBody>;
    expect(body.data).toMatchObject({
      checkInId: checkIn.id,
      customerId: customer.customerId,
      diagnosis: {
        causa: "Vazamento no retentor",
        problema: "Oleo vazando na parte inferior",
        recomendacao: "Substituir retentor e limpar area afetada",
      },
      publishReadiness: {
        canPublish: true,
        missing: [],
      },
      sourceKind: "check_in",
      status: "Rascunho",
      tenantId: fixture.tenantId,
      vehicleId: vehicle.vehicleId,
    });
  });

  it("QTE-01/D-03 creates a direct customer/vehicle quote with empty diagnosis and nullable delivery deadline", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);

    const response = await createQuote(authHeaders(session.accessToken), {
      customerId: customer.customerId,
      estimatedDeliveryAt: null,
      vehicleId: vehicle.vehicleId,
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as ApiData<QuoteBody>;
    expect(body.data).toMatchObject({
      checkInId: null,
      diagnosis: {
        causa: null,
        problema: null,
        recomendacao: null,
      },
      estimatedDeliveryAt: null,
      publishReadiness: {
        canPublish: false,
        missing: ["validUntil"],
      },
      sourceKind: "direct",
      tenantId: fixture.tenantId,
    });
  });

  it("QTE-02/QTE-04/QTE-05/QTE-06/QTE-07 edits one service/product item list with backend totals and warning-only discount limit", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const service = await createServiceCatalogFixture(prisma, fixture.tenantId, {
      basePrice: "150.00",
      name: "Troca de oleo",
    });
    const product = await createProductFixture(prisma, fixture.tenantId, {
      name: "Filtro de oleo",
      salePrice: "80.00",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const created = await readData<QuoteBody>(
      await createQuote(headers, {
        customerId: customer.customerId,
        vehicleId: vehicle.vehicleId,
      }),
    );

    const updateResponse = await fetch(`${baseUrl}/quotes/${created.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        estimatedDeliveryAt: null,
        items: [
          {
            discountAmount: "20.00",
            kind: "service",
            quantity: "2.000",
            serviceCatalogEntryId: service.id,
            surchargeAmount: "5.00",
          },
          {
            discountAmount: "10.00",
            kind: "product",
            productId: product.id,
            quantity: "3.000",
            surchargeAmount: "15.00",
          },
        ],
        quoteDiscountAmount: "50.00",
        quoteSurchargeAmount: "12.00",
        validUntil: "2026-08-15T00:00:00.000Z",
      }),
    });

    expect(updateResponse.status).toBe(200);

    const body = (await updateResponse.json()) as ApiData<QuoteBody>;
    expect(body.data.items.map((item) => item.kind)).toEqual(["service", "product"]);
    expect(body.data.items.map((item) => item.description)).toEqual([
      "Troca de oleo",
      "Filtro de oleo",
    ]);
    expect(body.data.totals).toEqual({
      discountAmount: "80.00",
      subtotalAmount: "540.00",
      surchargeAmount: "32.00",
      totalAmount: "492.00",
    });
    expect(body.data.discountWarning).toMatchObject({
      percent: "10.00",
      triggered: true,
    });
    expect(body.data.discountWarning.message).toContain("14.81%");
    expect(body.data.publishReadiness).toEqual({
      canPublish: true,
      missing: [],
    });

    const auditRows = await getAuditRows(prisma);
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["quotes.created", "quotes.draft.updated", "quotes.discount.warning"]),
    );
    expect(auditRows.every((row) => row.tenantId === fixture.tenantId)).toBe(true);
  });

  it("D-01/T-06-05 rejects cross-tenant linked IDs and does not leak foreign quotes in reads", async () => {
    const tenantA = await createTenantWithAdmin(prisma, { tenantName: "Oficina Quote A" });
    const tenantB = await createTenantWithAdmin(prisma, { tenantName: "Oficina Quote B" });
    const customerA = await createCustomerFixture(prisma, tenantA.tenantId);
    const vehicleA = await createVehicleFixture(prisma, tenantA.tenantId, customerA.customerId);
    const customerB = await createCustomerFixture(prisma, tenantB.tenantId);
    const vehicleB = await createVehicleFixture(prisma, tenantB.tenantId, customerB.customerId);
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);
    const headersB = authHeaders(sessionB.accessToken);
    const quoteB = await readData<QuoteBody>(
      await createQuote(headersB, {
        customerId: customerB.customerId,
        vehicleId: vehicleB.vehicleId,
      }),
    );

    const foreignCreate = await createQuote(headersA, {
      customerId: customerB.customerId,
      vehicleId: vehicleB.vehicleId,
    });
    const mismatchedVehicle = await createQuote(headersA, {
      customerId: customerA.customerId,
      vehicleId: vehicleB.vehicleId,
    });
    const foreignRead = await fetch(`${baseUrl}/quotes/${quoteB.id}`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const listA = await fetch(`${baseUrl}/quotes`, {
      headers: bearerHeaders(sessionA.accessToken),
    });

    expect(vehicleA.tenantId).toBe(tenantA.tenantId);
    expect(foreignCreate.status).toBe(400);
    expect(mismatchedVehicle.status).toBe(400);
    expect(foreignRead.status).toBe(404);

    const listBody = (await listA.json()) as ApiData<QuoteBody[]>;
    expect(listBody.data.map((quote) => quote.id)).not.toContain(quoteB.id);
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

async function createQuote(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}/quotes`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function readData<T>(response: Response): Promise<T> {
  expect(response.status).toBe(201);

  const body = (await response.json()) as ApiData<T>;
  return body.data;
}
