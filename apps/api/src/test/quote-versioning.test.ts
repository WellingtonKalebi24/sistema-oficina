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
    // keep quote versioning tests quiet while exercising the logger seam
  },
};

type ApiData<T> = {
  data: T;
};

type QuoteBody = {
  id: string;
  status: "Rascunho" | "Publicado" | "Enviado" | "Cancelado";
  totals: {
    discountAmount: string;
    subtotalAmount: string;
    surchargeAmount: string;
    totalAmount: string;
  };
};

type QuoteVersionBody = {
  customer: {
    name: string;
  };
  diagnosis: {
    causa: string | null;
    problema: string | null;
    recomendacao: string | null;
  };
  id: string;
  items: Array<{
    description: string;
    kind: "service" | "product";
    quantity: string;
    totalAmount: string;
    unitPrice: string;
  }>;
  status: "Publicado" | "Enviado" | "Cancelado";
  totals: {
    discountAmount: string;
    subtotalAmount: string;
    surchargeAmount: string;
    totalAmount: string;
  };
  validUntil: string;
  vehicle: {
    label: string;
  };
  versionNumber: number;
};

type QuoteLinkBody = {
  approvalUrl: string;
  expiresAt: string | null;
  quoteVersionId: string;
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

describe("quote versioning API contract", () => {
  it("QTE-08/D-11/D-13 publishes an immutable version and keeps above-limit discounts warning-only", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId, {
      name: "Cliente Imutavel",
    });
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId, {
      brand: "Honda",
      model: "Fit",
      plateNormalized: "PUB0808",
      year: 2021,
    });
    const service = await createServiceCatalogFixture(prisma, fixture.tenantId, {
      basePrice: "150.00",
      name: "Diagnostico eletrico",
    });
    const product = await createProductFixture(prisma, fixture.tenantId, {
      name: "Sensor MAP",
      salePrice: "80.00",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const draft = await createReadyDraft(headers, customer.customerId, vehicle.vehicleId, service.id, product.id);

    const publishResponse = await fetch(`${baseUrl}/quotes/${draft.id}/publish`, {
      method: "POST",
      headers,
    });

    expect(publishResponse.status).toBe(201);

    const published = (await publishResponse.json()) as ApiData<QuoteVersionBody>;
    expect(published.data).toMatchObject({
      customer: { name: "Cliente Imutavel" },
      items: [
        {
          description: "Diagnostico eletrico",
          kind: "service",
          quantity: "2.000",
          totalAmount: "280.00",
          unitPrice: "150.00",
        },
        {
          description: "Sensor MAP",
          kind: "product",
          quantity: "3.000",
          totalAmount: "245.00",
          unitPrice: "80.00",
        },
      ],
      status: "Publicado",
      totals: {
        discountAmount: "80.00",
        subtotalAmount: "540.00",
        surchargeAmount: "32.00",
        totalAmount: "492.00",
      },
      versionNumber: 1,
    });

    await prisma.serviceCatalogEntry.update({
      data: { basePrice: "999.00", name: "Diagnostico alterado" },
      where: { id: service.id },
    });
    await prisma.product.update({
      data: { name: "Sensor alterado", salePrice: "999.00" },
      where: { id: product.id },
    });

    const newVersionResponse = await fetch(`${baseUrl}/quotes/${draft.id}/new-version`, {
      method: "POST",
      headers,
    });
    expect(newVersionResponse.status).toBe(201);

    const newDraft = (await newVersionResponse.json()) as ApiData<QuoteBody>;
    expect(newDraft.data.status).toBe("Rascunho");

    const editNewDraftResponse = await fetch(`${baseUrl}/quotes/${draft.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        items: [
          {
            kind: "service",
            quantity: "1.000",
            serviceCatalogEntryId: service.id,
          },
        ],
        validUntil: "2026-08-30T00:00:00.000Z",
      }),
    });
    expect(editNewDraftResponse.status).toBe(200);

    const priorVersionResponse = await fetch(
      `${baseUrl}/quotes/${draft.id}/versions/${published.data.id}`,
      {
        headers: bearerHeaders(session.accessToken),
      },
    );
    expect(priorVersionResponse.status).toBe(200);

    const priorVersion = (await priorVersionResponse.json()) as ApiData<QuoteVersionBody>;
    expect(priorVersion.data.items.map((item) => item.description)).toEqual([
      "Diagnostico eletrico",
      "Sensor MAP",
    ]);
    expect(priorVersion.data.totals.totalAmount).toBe("492.00");

    const auditRows = await getAuditRows(prisma);
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "quotes.discount.warning",
        "quotes.version.published",
        "quotes.version.draft.created",
      ]),
    );
  });

  it("QTE-11/D-17 creates manual links and manual sent status without communication side effects", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const draft = await createDirectDraft(headers, customer.customerId, vehicle.vehicleId);

    const draftLinkResponse = await fetch(`${baseUrl}/quotes/${draft.id}/versions/draft/link`, {
      method: "POST",
      headers,
    });
    expect(draftLinkResponse.status).toBe(404);

    const publishResponse = await fetch(`${baseUrl}/quotes/${draft.id}/publish`, {
      method: "POST",
      headers,
    });
    expect(publishResponse.status).toBe(201);

    const published = (await publishResponse.json()) as ApiData<QuoteVersionBody>;
    const linkResponse = await fetch(
      `${baseUrl}/quotes/${draft.id}/versions/${published.data.id}/link`,
      {
        method: "POST",
        headers,
      },
    );
    expect(linkResponse.status).toBe(201);

    const link = (await linkResponse.json()) as ApiData<QuoteLinkBody>;
    expect(link.data).toMatchObject({
      quoteVersionId: published.data.id,
    });
    expect(link.data.approvalUrl).toMatch(/^https?:\/\/127\.0\.0\.1:\d+\/quote-approval\//);

    const linkRows = await prisma.quoteApprovalLink.findMany();
    expect(linkRows).toHaveLength(1);
    expect(linkRows[0]?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(linkRows)).not.toContain(link.data.approvalUrl.split("/").pop() ?? "");

    const sentResponse = await fetch(`${baseUrl}/quotes/${draft.id}/mark-sent`, {
      method: "POST",
      headers,
    });
    expect(sentResponse.status).toBe(200);

    const sent = (await sentResponse.json()) as ApiData<QuoteVersionBody>;
    expect(sent.data.status).toBe("Enviado");

    const auditRows = await getAuditRows(prisma);
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["quotes.link.created", "quotes.status.sent"]),
    );
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toMatch(/token|hash|secret/i);
    expect(JSON.stringify(auditRows)).not.toMatch(
      /notification|message|delivery|read|whatsapp|sms|push/i,
    );
  });

  it("D-02 requires diagnosis for check-in-origin publication but not direct customer quotes", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const checkIn = await createReceptionCheckInFixture(
      prisma,
      fixture.tenantId,
      customer.customerId,
      vehicle.vehicleId,
    );
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const checkInQuote = await readData<QuoteBody>(
      await createQuote(headers, {
        checkInId: checkIn.id,
        customerId: customer.customerId,
        validUntil: "2026-08-15T00:00:00.000Z",
        vehicleId: vehicle.vehicleId,
      }),
      201,
    );
    const directQuote = await createDirectDraft(headers, customer.customerId, vehicle.vehicleId);

    const rejected = await fetch(`${baseUrl}/quotes/${checkInQuote.id}/publish`, {
      method: "POST",
      headers,
    });
    const publishedDirect = await fetch(`${baseUrl}/quotes/${directQuote.id}/publish`, {
      method: "POST",
      headers,
    });

    expect(rejected.status).toBe(400);
    expect(publishedDirect.status).toBe(201);
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

async function createDirectDraft(
  headers: Record<string, string>,
  customerId: string,
  vehicleId: string,
): Promise<QuoteBody> {
  return readData<QuoteBody>(
    await createQuote(headers, {
      customerId,
      validUntil: "2026-08-15T00:00:00.000Z",
      vehicleId,
    }),
    201,
  );
}

async function createReadyDraft(
  headers: Record<string, string>,
  customerId: string,
  vehicleId: string,
  serviceCatalogEntryId: string,
  productId: string,
): Promise<QuoteBody> {
  const created = await createDirectDraft(headers, customerId, vehicleId);
  const updated = await fetch(`${baseUrl}/quotes/${created.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      items: [
        {
          discountAmount: "20.00",
          kind: "service",
          quantity: "2.000",
          serviceCatalogEntryId,
          surchargeAmount: "0.00",
        },
        {
          discountAmount: "10.00",
          kind: "product",
          productId,
          quantity: "3.000",
          surchargeAmount: "15.00",
        },
      ],
      quoteDiscountAmount: "50.00",
      quoteSurchargeAmount: "17.00",
      validUntil: "2026-08-15T00:00:00.000Z",
    }),
  });

  return readData<QuoteBody>(updated, 200);
}

async function readData<T>(response: Response, status: number): Promise<T> {
  expect(response.status).toBe(status);

  const body = (await response.json()) as ApiData<T>;
  return body.data;
}
