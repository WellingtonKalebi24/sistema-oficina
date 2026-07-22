import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createTenantWithAdmin, getAuditRows, loginAs, resetIdentityTables } from "./testData.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep customer/vehicle contract tests quiet while exercising the logger seam
  },
};

type ApiData<T> = {
  data: T;
};

type CustomerBody = {
  documentNormalized: string | null;
  documentType: string | null;
  id: string;
  name: string;
  phoneNormalized: string | null;
  tenantId: string;
};

type VehicleBody = {
  customerId: string;
  id: string;
  plateNormalized: string | null;
  tenantId: string;
  vinNormalized: string | null;
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

describe("customer and vehicle API contract", () => {
  it("creates, edits, lists, searches and soft-deletes customers inside the authenticated tenant", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Clientes",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const createResponse = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        document: "123.456.789-01",
        email: "ana@example.test",
        name: "Ana Cliente",
        notes: "Prefere atendimento pela manha",
        phone: "+55 (11) 98888-7777",
      }),
    });

    expect(createResponse.status).toBe(201);

    const createBody = (await createResponse.json()) as ApiData<CustomerBody>;

    expect(createBody.data).toMatchObject({
      documentNormalized: "12345678901",
      documentType: "cpf",
      name: "Ana Cliente",
      phoneNormalized: "11988887777",
      tenantId: fixture.tenantId,
    });

    const updateResponse = await fetch(`${baseUrl}/customers/${createBody.data.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        name: "Ana Cliente Atualizada",
        phone: "(11) 97777-6666",
      }),
    });
    const listResponse = await fetch(`${baseUrl}/customers`, {
      headers: bearerHeaders(session.accessToken),
    });
    const searchByNameResponse = await fetch(`${baseUrl}/customers?search=Atualizada`, {
      headers: bearerHeaders(session.accessToken),
    });
    const searchByPhoneResponse = await fetch(`${baseUrl}/customers?search=977776666`, {
      headers: bearerHeaders(session.accessToken),
    });
    const searchByDocumentResponse = await fetch(`${baseUrl}/customers?search=12345678901`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(updateResponse.status).toBe(200);
    expect(listResponse.status).toBe(200);
    expect(searchByNameResponse.status).toBe(200);
    expect(searchByPhoneResponse.status).toBe(200);
    expect(searchByDocumentResponse.status).toBe(200);

    for (const response of [listResponse, searchByNameResponse, searchByPhoneResponse]) {
      const body = (await response.json()) as ApiData<CustomerBody[]>;
      expect(body.data.map((customer) => customer.id)).toContain(createBody.data.id);
    }

    const deleteResponse = await fetch(`${baseUrl}/customers/${createBody.data.id}`, {
      method: "DELETE",
      headers: bearerHeaders(session.accessToken),
    });
    const listAfterDeleteResponse = await fetch(`${baseUrl}/customers`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(deleteResponse.status).toBe(204);
    expect(listAfterDeleteResponse.status).toBe(200);

    const listAfterDeleteBody = (await listAfterDeleteResponse.json()) as ApiData<CustomerBody[]>;
    expect(listAfterDeleteBody.data.map((customer) => customer.id)).not.toContain(
      createBody.data.id,
    );
  });

  it("creates, edits, lists, searches, links and soft-deletes vehicles inside the authenticated tenant", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const customer = await createCustomer(headers, {
      document: "AB12CD34EF56GH",
      name: "Cliente Frota",
      phone: "(21) 3222-1000",
    });

    expect(customer.documentNormalized).toBe("AB12CD34EF56GH");
    expect(customer.documentType).toBe("cnpj");

    const vehicleResponse = await fetch(`${baseUrl}/vehicles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        brand: "Fiat",
        color: "Prata",
        customerId: customer.id,
        mileage: 90000,
        model: "Toro",
        plate: "abc-1d23",
        vin: "9BWZZZ377VT004251",
        year: 2021,
      }),
    });

    expect(vehicleResponse.status).toBe(201);

    const vehicleBody = (await vehicleResponse.json()) as ApiData<VehicleBody>;

    expect(vehicleBody.data).toMatchObject({
      customerId: customer.id,
      plateNormalized: "ABC1D23",
      tenantId: fixture.tenantId,
      vinNormalized: "9BWZZZ377VT004251",
    });

    const updateVehicleResponse = await fetch(`${baseUrl}/vehicles/${vehicleBody.data.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        color: "Cinza",
        mileage: 90500,
      }),
    });
    const listVehiclesResponse = await fetch(`${baseUrl}/vehicles`, {
      headers: bearerHeaders(session.accessToken),
    });
    const searchByPlateResponse = await fetch(`${baseUrl}/vehicles?search=ABC1D23`, {
      headers: bearerHeaders(session.accessToken),
    });
    const searchByCustomerResponse = await fetch(`${baseUrl}/vehicles?search=Frota`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(updateVehicleResponse.status).toBe(200);
    expect(listVehiclesResponse.status).toBe(200);
    expect(searchByPlateResponse.status).toBe(200);
    expect(searchByCustomerResponse.status).toBe(200);

    const permissivePlateResponse = await fetch(`${baseUrl}/vehicles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerId: customer.id,
        plate: "@@@",
      }),
    });

    expect(permissivePlateResponse.status).toBe(201);

    for (const [label, response] of [
      ["list", listVehiclesResponse],
      ["plate", searchByPlateResponse],
      ["customer", searchByCustomerResponse],
    ] as const) {
      const body = (await response.json()) as ApiData<VehicleBody[]>;
      expect(body.data.map((vehicle) => vehicle.id), label).toContain(vehicleBody.data.id);
    }

    const secondVehicleResponse = await fetch(`${baseUrl}/vehicles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        brand: "Volkswagen",
        customerId: customer.id,
        model: "Gol",
        plate: "ABC1234",
        year: 2018,
      }),
    });

    expect(secondVehicleResponse.status).toBe(201);

    const deleteVehicleResponse = await fetch(`${baseUrl}/vehicles/${vehicleBody.data.id}`, {
      method: "DELETE",
      headers: bearerHeaders(session.accessToken),
    });

    expect(deleteVehicleResponse.status).toBe(204);
  });

  it("blocks active duplicate documents, plates and VINs while allowing phone reuse and soft-delete recreation", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const firstCustomer = await createCustomer(headers, {
      document: "111.222.333-44",
      name: "Cliente Original",
      phone: "(31) 98888-0000",
    });
    const sharedPhoneCustomerResponse = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        document: "222.333.444-55",
        name: "Cliente Mesmo Telefone",
        phone: "(31) 98888-0000",
      }),
    });
    const duplicateDocumentResponse = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        document: "11122233344",
        name: "Cliente Documento Duplicado",
      }),
    });

    expect(fixture.tenantId).toBeTruthy();
    expect(sharedPhoneCustomerResponse.status).toBe(201);
    expect(duplicateDocumentResponse.status).toBe(409);

    const sharedPhoneCustomerBody =
      (await sharedPhoneCustomerResponse.json()) as ApiData<CustomerBody>;
    const vehicle = await createVehicle(headers, {
      customerId: firstCustomer.id,
      plate: "MNO-1234",
      vin: "9BWZZZ377VT004252",
    });
    const duplicatePlateResponse = await fetch(`${baseUrl}/vehicles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerId: firstCustomer.id,
        plate: "MNO1234",
      }),
    });
    const duplicateVinResponse = await fetch(`${baseUrl}/vehicles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerId: firstCustomer.id,
        plate: "MNO1A23",
        vin: "9BWZZZ377VT004252",
      }),
    });

    expect(duplicatePlateResponse.status).toBe(409);
    expect(duplicateVinResponse.status).toBe(409);

    const deleteCustomerResponse = await fetch(`${baseUrl}/customers/${firstCustomer.id}`, {
      method: "DELETE",
      headers: bearerHeaders(session.accessToken),
    });
    const deleteVehicleResponse = await fetch(`${baseUrl}/vehicles/${vehicle.id}`, {
      method: "DELETE",
      headers: bearerHeaders(session.accessToken),
    });

    expect(deleteCustomerResponse.status).toBe(204);
    expect(deleteVehicleResponse.status).toBe(204);

    const recreateCustomerResponse = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        document: "11122233344",
        name: "Cliente Recriado",
      }),
    });
    const recreateVehicleResponse = await fetch(`${baseUrl}/vehicles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerId: sharedPhoneCustomerBody.data.id,
        plate: "MNO1234",
        vin: "9BWZZZ377VT004252",
      }),
    });

    expect(recreateCustomerResponse.status).toBe(201);
    expect(recreateVehicleResponse.status).toBe(201);
  });

  it("writes basic history and sanitized audit rows for customer and vehicle mutations", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const customer = await createCustomer(headers, {
      document: "333.444.555-66",
      name: "Cliente Historico",
    });
    const vehicle = await createVehicle(headers, {
      customerId: customer.id,
      plate: "HIS-2026",
    });

    await fetch(`${baseUrl}/customers/${customer.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "Cliente Historico Atualizado" }),
    });
    await fetch(`${baseUrl}/vehicles/${vehicle.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ mileage: 50100 }),
    });

    const customerHistoryResponse = await fetch(`${baseUrl}/customers/${customer.id}/history`, {
      headers: bearerHeaders(session.accessToken),
    });
    const vehicleHistoryResponse = await fetch(`${baseUrl}/vehicles/${vehicle.id}/history`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(customerHistoryResponse.status).toBe(200);
    expect(vehicleHistoryResponse.status).toBe(200);

    const customerHistoryBody = (await customerHistoryResponse.json()) as ApiData<
      Array<{ type: string }>
    >;
    const vehicleHistoryBody = (await vehicleHistoryResponse.json()) as ApiData<
      Array<{ type: string }>
    >;

    expect(customerHistoryBody.data.map((event) => event.type)).toEqual(
      expect.arrayContaining(["customer.created", "customer.updated"]),
    );
    expect(vehicleHistoryBody.data.map((event) => event.type)).toEqual(
      expect.arrayContaining(["vehicle.created", "vehicle.updated", "vehicle.linked"]),
    );

    const auditRows = await getAuditRows(prisma);
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "customers.created",
        "customers.updated",
        "vehicles.created",
        "vehicles.updated",
      ]),
    );
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toContain(
      "Prefere atendimento",
    );
  });

  it("prevents tenant A from listing, reading, updating, deleting or linking tenant B records", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Tenant A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Tenant B",
    });
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);
    const headersB = authHeaders(sessionB.accessToken);
    const customerA = await createCustomer(headersA, {
      document: "444.555.666-77",
      name: "Cliente Tenant A",
    });
    const customerB = await createCustomer(headersB, {
      document: "555.666.777-88",
      name: "Cliente Tenant B",
    });
    const vehicleB = await createVehicle(headersB, {
      customerId: customerB.id,
      plate: "TEN-0002",
    });

    const listCustomersAResponse = await fetch(`${baseUrl}/customers`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const listVehiclesAResponse = await fetch(`${baseUrl}/vehicles`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const readCustomerBResponse = await fetch(`${baseUrl}/customers/${customerB.id}`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const readVehicleBResponse = await fetch(`${baseUrl}/vehicles/${vehicleB.id}`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const updateCustomerBResponse = await fetch(`${baseUrl}/customers/${customerB.id}`, {
      method: "PATCH",
      headers: headersA,
      body: JSON.stringify({ name: "Cross Tenant" }),
    });
    const updateVehicleBResponse = await fetch(`${baseUrl}/vehicles/${vehicleB.id}`, {
      method: "PATCH",
      headers: headersA,
      body: JSON.stringify({ color: "Cross Tenant" }),
    });
    const linkVehicleBToCustomerAResponse = await fetch(`${baseUrl}/vehicles/${vehicleB.id}`, {
      method: "PATCH",
      headers: headersA,
      body: JSON.stringify({ customerId: customerA.id }),
    });
    const deleteCustomerBResponse = await fetch(`${baseUrl}/customers/${customerB.id}`, {
      method: "DELETE",
      headers: bearerHeaders(sessionA.accessToken),
    });
    const deleteVehicleBResponse = await fetch(`${baseUrl}/vehicles/${vehicleB.id}`, {
      method: "DELETE",
      headers: bearerHeaders(sessionA.accessToken),
    });

    expect(listCustomersAResponse.status).toBe(200);
    expect(listVehiclesAResponse.status).toBe(200);

    const customersA = (await listCustomersAResponse.json()) as ApiData<CustomerBody[]>;
    const vehiclesA = (await listVehiclesAResponse.json()) as ApiData<VehicleBody[]>;

    expect(customersA.data.map((customer) => customer.id)).toContain(customerA.id);
    expect(customersA.data.map((customer) => customer.id)).not.toContain(customerB.id);
    expect(vehiclesA.data.map((vehicle) => vehicle.id)).not.toContain(vehicleB.id);
    expect(readCustomerBResponse.status).toBe(404);
    expect(readVehicleBResponse.status).toBe(404);
    expect(updateCustomerBResponse.status).toBe(404);
    expect(updateVehicleBResponse.status).toBe(404);
    expect(linkVehicleBToCustomerAResponse.status).toBe(404);
    expect(deleteCustomerBResponse.status).toBe(404);
    expect(deleteVehicleBResponse.status).toBe(404);
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

async function createCustomer(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<CustomerBody> {
  const response = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(201);

  const responseBody = (await response.json()) as ApiData<CustomerBody>;
  return responseBody.data;
}

async function createVehicle(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<VehicleBody> {
  const response = await fetch(`${baseUrl}/vehicles`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(201);

  const responseBody = (await response.json()) as ApiData<VehicleBody>;
  return responseBody.data;
}
