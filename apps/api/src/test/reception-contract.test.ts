import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import {
  createCustomerFixture,
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
    // keep reception contract tests quiet while exercising the logger seam
  },
};

type ApiData<T> = {
  data: T;
};

type AppointmentBody = {
  actions?: string[];
  cancelledByUserId: string | null;
  customer: {
    id: string;
    name: string;
  };
  customerId: string;
  expectedService: string;
  id: string;
  notes: string | null;
  origin: string;
  startsAt: string;
  status: "Agendado" | "Cancelado" | "Convertido";
  tenantId: string;
  vehicle: {
    id: string;
    plateNormalized: string | null;
  };
  vehicleId: string;
};

type CheckInBody = {
  appointment: {
    id: string;
    status: "Agendado" | "Cancelado" | "Convertido";
  };
  appointmentId: string;
  checklistItems: Array<{
    condition: string;
    id: string;
    label: string;
    notes: string | null;
  }>;
  customerId: string;
  damageNotes: string;
  enteredAt: string;
  fuelLevel: string;
  id: string;
  itemsLeft: string | null;
  mileage: number | null;
  status: "Aguardando diagnostico";
  tenantId: string;
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

describe("reception appointment API contract", () => {
  it("REC-01/REC-02 creates, edits, cancels and lists daily appointments ordered by time", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Agenda",
    });
    const customer = await createCustomerFixture(prisma, fixture.tenantId, {
      name: "Cliente Agenda",
    });
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId, {
      plateNormalized: "AGD0101",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const later = await createAppointment(headers, {
      customerId: customer.customerId,
      expectedService: "Alinhamento",
      notes: "Cliente aguardara na recepcao",
      origin: "phone",
      startsAt: "2026-07-24T13:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });
    const earlier = await createAppointment(headers, {
      customerId: customer.customerId,
      expectedService: "Troca de oleo",
      origin: "counter",
      startsAt: "2026-07-24T11:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });

    const updateResponse = await fetch(`${baseUrl}/reception/appointments/${later.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        expectedService: "Alinhamento e balanceamento",
        notes: "Atualizado no balcao",
        startsAt: "2026-07-24T14:00:00.000Z",
      }),
    });
    const cancelResponse = await fetch(`${baseUrl}/reception/appointments/${earlier.id}/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reason: "Cliente remarcou",
      }),
    });
    const dailyResponse = await fetch(`${baseUrl}/reception/appointments?date=2026-07-24`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(updateResponse.status).toBe(200);
    expect(cancelResponse.status).toBe(200);
    expect(dailyResponse.status).toBe(200);

    const updated = (await updateResponse.json()) as ApiData<AppointmentBody>;
    const cancelled = (await cancelResponse.json()) as ApiData<AppointmentBody>;
    const daily = (await dailyResponse.json()) as ApiData<AppointmentBody[]>;

    expect(updated.data).toMatchObject({
      expectedService: "Alinhamento e balanceamento",
      notes: "Atualizado no balcao",
      status: "Agendado",
      tenantId: fixture.tenantId,
    });
    expect(cancelled.data).toMatchObject({
      cancelledByUserId: fixture.adminId,
      status: "Cancelado",
    });
    expect(daily.data.map((appointment) => appointment.id)).toEqual([earlier.id, later.id]);
    expect(daily.data[0]).toMatchObject({
      actions: ["Fazer check-in", "Editar", "Cancelar"],
      customer: {
        id: customer.customerId,
        name: customer.name,
      },
      vehicle: {
        id: vehicle.vehicleId,
        plateNormalized: "AGD0101",
      },
    });
  });

  it("REC-01 returns weekly agenda data ordered by startsAt for the table-first UI", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const wednesday = await createAppointment(headers, {
      customerId: customer.customerId,
      expectedService: "Revisao semanal",
      origin: "counter",
      startsAt: "2026-07-22T15:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });
    const monday = await createAppointment(headers, {
      customerId: customer.customerId,
      expectedService: "Diagnostico inicial",
      origin: "counter",
      startsAt: "2026-07-20T12:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });

    const response = await fetch(`${baseUrl}/reception/appointments?weekOf=2026-07-20`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as ApiData<AppointmentBody[]>;
    expect(body.data.map((appointment) => appointment.id)).toEqual([monday.id, wednesday.id]);
    expect(body.data[0]).toMatchObject({
      customerId: customer.customerId,
      status: "Agendado",
      vehicleId: vehicle.vehicleId,
    });
  });

  it("D-05 rejects appointment creation with foreign-tenant customer or vehicle IDs", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Agenda A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Agenda B",
    });
    const customerA = await createCustomerFixture(prisma, tenantA.tenantId);
    const customerB = await createCustomerFixture(prisma, tenantB.tenantId);
    const vehicleB = await createVehicleFixture(prisma, tenantB.tenantId, customerB.customerId);
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);

    const foreignCustomerResponse = await fetch(`${baseUrl}/reception/appointments`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        customerId: customerB.customerId,
        expectedService: "Tentativa cross tenant",
        origin: "counter",
        startsAt: "2026-07-24T12:00:00.000Z",
        vehicleId: vehicleB.vehicleId,
      }),
    });
    const foreignVehicleResponse = await fetch(`${baseUrl}/reception/appointments`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        customerId: customerA.customerId,
        expectedService: "Tentativa cross tenant veiculo",
        origin: "counter",
        startsAt: "2026-07-24T13:00:00.000Z",
        vehicleId: vehicleB.vehicleId,
      }),
    });

    expect(foreignCustomerResponse.status).toBe(400);
    expect(foreignVehicleResponse.status).toBe(400);
  });

  it("REC-08 audits create, update and cancel appointment changes without raw notes", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const appointment = await createAppointment(headers, {
      customerId: customer.customerId,
      expectedService: "Servico auditavel",
      notes: "Observacao operacional longa nao deve virar dump de auditoria",
      origin: "counter",
      startsAt: "2026-07-24T12:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });

    await fetch(`${baseUrl}/reception/appointments/${appointment.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        notes: "Outra observacao extensa",
      }),
    });
    await fetch(`${baseUrl}/reception/appointments/${appointment.id}/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reason: "Cancelamento auditavel",
      }),
    });

    const auditRows = await getAuditRows(prisma);

    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "reception.appointments.created",
        "reception.appointments.updated",
        "reception.appointments.cancelled",
      ]),
    );
    expect(auditRows.every((row) => row.tenantId === fixture.tenantId)).toBe(true);
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toContain(
      "Observacao operacional longa",
    );
  });
});

describe("reception check-in RED API contract", () => {
  it("D-01/D-02/D-03/D-06/D-07/D-08 converts an appointment into a required-data check-in while optional fields and attachments may be absent", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Check-in",
    });
    const customer = await createCustomerFixture(prisma, fixture.tenantId, {
      name: "Cliente Check-in",
    });
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId, {
      plateNormalized: "CHK0101",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const appointment = await createAppointment(headers, {
      customerId: customer.customerId,
      expectedService: "Recepcao para diagnostico",
      origin: "counter",
      startsAt: "2026-07-24T12:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });

    const response = await createCheckIn(headers, {
      appointmentId: appointment.id,
      checklistItems: [
        {
          condition: "ok",
          label: "Lataria dianteira",
          notes: "Sem novas avarias",
        },
        {
          condition: "avaria",
          label: "Parachoque traseiro",
          notes: "Risco visivel na entrada",
        },
      ],
      customerId: customer.customerId,
      damageNotes: "Risco visivel no parachoque traseiro",
      enteredAt: "2026-07-24T12:10:00.000Z",
      fuelLevel: "1/2",
      vehicleId: vehicle.vehicleId,
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as ApiData<CheckInBody>;
    expect(body.data).toMatchObject({
      appointmentId: appointment.id,
      customerId: customer.customerId,
      damageNotes: "Risco visivel no parachoque traseiro",
      fuelLevel: "1/2",
      itemsLeft: null,
      mileage: null,
      status: "Aguardando diagnostico",
      tenantId: fixture.tenantId,
      vehicleId: vehicle.vehicleId,
    });
    expect(body.data.appointment.status).toBe("Convertido");
    expect(body.data.checklistItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          condition: "ok",
          label: "Lataria dianteira",
        }),
        expect.objectContaining({
          condition: "avaria",
          label: "Parachoque traseiro",
        }),
      ]),
    );
  });

  it("D-01/D-02/D-04/D-06 creates a direct check-in with a converted trace appointment and persists optional mileage/items-left data", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Check-in Direto",
    });
    const customer = await createCustomerFixture(prisma, fixture.tenantId, {
      name: "Cliente Direto",
    });
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId, {
      plateNormalized: "DIR0101",
    });
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const response = await createCheckIn(headers, {
      checklistItems: [
        {
          condition: "ok",
          label: "Painel e luzes",
        },
      ],
      customerId: customer.customerId,
      damageNotes: "Sem avarias aparentes",
      enteredAt: "2026-07-24T13:10:00.000Z",
      expectedService: "Check-in direto para diagnostico",
      fuelLevel: "3/4",
      itemsLeft: "Documento do veiculo no porta-luvas",
      mileage: 48210,
      vehicleId: vehicle.vehicleId,
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as ApiData<CheckInBody>;
    expect(body.data.appointmentId).toEqual(expect.any(String));
    expect(body.data.appointment.status).toBe("Convertido");
    expect(body.data).toMatchObject({
      customerId: customer.customerId,
      itemsLeft: "Documento do veiculo no porta-luvas",
      mileage: 48210,
      status: "Aguardando diagnostico",
      vehicleId: vehicle.vehicleId,
    });
  });

  it("D-05/D-07 rejects check-in without tenant-scoped customer, vehicle, entry date, fuel level or checklist inspection data", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Check-in A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Check-in B",
    });
    const customerA = await createCustomerFixture(prisma, tenantA.tenantId);
    const customerB = await createCustomerFixture(prisma, tenantB.tenantId);
    const vehicleB = await createVehicleFixture(prisma, tenantB.tenantId, customerB.customerId);
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);

    const missingFuel = await createCheckIn(headersA, {
      checklistItems: [
        {
          condition: "ok",
          label: "Lataria",
        },
      ],
      customerId: customerA.customerId,
      damageNotes: "Sem avarias",
      enteredAt: "2026-07-24T14:10:00.000Z",
      vehicleId: vehicleB.vehicleId,
    });
    const missingChecklist = await createCheckIn(headersA, {
      customerId: customerA.customerId,
      damageNotes: "Sem avarias",
      enteredAt: "2026-07-24T14:10:00.000Z",
      fuelLevel: "1/4",
      vehicleId: vehicleB.vehicleId,
    });
    const foreignCustomerVehicle = await createCheckIn(headersA, {
      checklistItems: [
        {
          condition: "ok",
          label: "Lataria",
        },
      ],
      customerId: customerB.customerId,
      damageNotes: "Tentativa cross tenant",
      enteredAt: "2026-07-24T14:10:00.000Z",
      fuelLevel: "1/4",
      vehicleId: vehicleB.vehicleId,
    });

    expect(missingFuel.status).toBe(400);
    expect(missingChecklist.status).toBe(400);
    expect(foreignCustomerVehicle.status).toBe(400);
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

async function createAppointment(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<AppointmentBody> {
  const response = await fetch(`${baseUrl}/reception/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(201);

  const responseBody = (await response.json()) as ApiData<AppointmentBody>;
  return responseBody.data;
}

async function createCheckIn(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}/reception/check-ins`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
