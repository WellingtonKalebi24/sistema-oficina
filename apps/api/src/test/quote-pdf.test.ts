import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import {
  createCustomerFixture,
  createProductFixture,
  createServiceCatalogFixture,
  createTenantWithAdmin,
  createVehicleFixture,
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
    // keep quote PDF tests quiet while exercising the logger seam
  },
};

type ApiData<T> = {
  data: T;
};

type QuoteBody = {
  id: string;
};

type QuoteVersionBody = {
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

describe("quote PDF API contract", () => {
  it("QTE-10/D-18/D-19/D-22 streams customer-facing PDF content from a published snapshot only", async () => {
    const fixture = await createTenantWithAdmin(prisma, { tenantName: "Oficina PDF" });
    const customer = await createCustomerFixture(prisma, fixture.tenantId, {
      name: "Cliente PDF",
    });
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId, {
      brand: "Toyota",
      model: "Corolla",
      plateNormalized: "PDF1010",
      year: 2022,
    });
    const service = await createServiceCatalogFixture(prisma, fixture.tenantId, {
      basePrice: "300.00",
      name: "Revisao completa",
    });
    const product = await createProductFixture(prisma, fixture.tenantId, {
      name: "Kit filtros original",
      salePrice: "120.00",
    });
    await prisma.product.update({
      data: {
        costPrice: "55.00",
        description: "Fornecedor interno reservado",
      },
      where: { id: product.id },
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const draft = await readData<QuoteBody>(
      await createQuote(headers, {
        customerId: customer.customerId,
        customerNotes: "Observacao visivel ao cliente",
        diagnosis: {
          causa: "Desgaste natural",
          problema: "Barulho ao frear",
          recomendacao: "Trocar componentes e revisar sistema",
        },
        internalNotes: "Custo interno 55.00 e margem 40%",
        items: [
          {
            kind: "service",
            quantity: "1.000",
            serviceCatalogEntryId: service.id,
          },
          {
            kind: "product",
            productId: product.id,
            quantity: "2.000",
          },
        ],
        validUntil: "2026-08-15T00:00:00.000Z",
        vehicleId: vehicle.vehicleId,
      }),
      201,
    );

    const draftPdfResponse = await fetch(`${baseUrl}/quotes/${draft.id}/versions/draft/pdf`, {
      headers: bearerHeaders(session.accessToken),
    });
    expect(draftPdfResponse.status).toBe(404);

    const published = await readData<QuoteVersionBody>(
      await fetch(`${baseUrl}/quotes/${draft.id}/publish`, {
        method: "POST",
        headers,
      }),
      201,
    );
    const pdfResponse = await fetch(`${baseUrl}/quotes/${draft.id}/versions/${published.id}/pdf`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get("content-type")).toContain("application/pdf");

    const pdfText = Buffer.from(await pdfResponse.arrayBuffer()).toString("latin1");
    expect(pdfText).toContain("Oficina PDF");
    expect(pdfText).toContain("Cliente PDF");
    expect(pdfText).toContain("Toyota Corolla");
    expect(pdfText).toContain("PDF1010");
    expect(pdfText).toContain("Revisao completa");
    expect(pdfText).toContain("Kit filtros original");
    expect(pdfText).toContain("Barulho ao frear");
    expect(pdfText).toContain("Desgaste natural");
    expect(pdfText).toContain("Trocar componentes");
    expect(pdfText).toContain("Observacao visivel ao cliente");
    expect(pdfText).not.toContain("Custo interno");
    expect(pdfText).not.toContain("margem");
    expect(pdfText).not.toContain("Fornecedor interno");
    expect(pdfText).not.toMatch(/token|hash|permission|audit/i);
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

async function readData<T>(response: Response, status: number): Promise<T> {
  expect(response.status).toBe(status);

  const body = (await response.json()) as ApiData<T>;
  return body.data;
}
