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
    // keep reception audit tests quiet while exercising audit behavior
  },
};

type ApiData<T> = {
  data: T;
};

type AppointmentBody = {
  id: string;
};

type CheckInBody = {
  appointmentId: string;
  id: string;
  status: "Aguardando diagnostico";
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

describe("reception check-in audit RED contract", () => {
  it("D-03/D-10/REC-08 audits appointment conversion and check-in creation from an appointment", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Auditoria Check-in",
    });
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const appointment = await createAppointment(headers, {
      customerId: customer.customerId,
      expectedService: "Auditoria de conversao",
      origin: "counter",
      startsAt: "2026-07-24T12:00:00.000Z",
      vehicleId: vehicle.vehicleId,
    });

    const response = await createCheckIn(headers, {
      appointmentId: appointment.id,
      checklistItems: [
        {
          condition: "ok",
          label: "Lataria",
        },
      ],
      customerId: customer.customerId,
      damageNotes: "Sem avarias aparentes",
      enteredAt: "2026-07-24T12:15:00.000Z",
      fuelLevel: "1/2",
      vehicleId: vehicle.vehicleId,
    });

    expect(response.status).toBe(201);

    const checkIn = ((await response.json()) as ApiData<CheckInBody>).data;
    const auditRows = await getAuditRows(prisma);

    expect(checkIn.status).toBe("Aguardando diagnostico");
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["reception.appointments.converted", "reception.checkins.created"]),
    );
    expect(auditRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "appointment",
          recordId: appointment.id,
          tenantId: fixture.tenantId,
          userId: fixture.adminId,
        }),
        expect.objectContaining({
          entity: "reception_check_in",
          recordId: checkIn.id,
          tenantId: fixture.tenantId,
          userId: fixture.adminId,
        }),
      ]),
    );
  });

  it("D-04/D-10/REC-08 audits direct check-in trace appointment creation and conversion", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Auditoria Direta",
    });
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);

    const response = await createCheckIn(headers, {
      checklistItems: [
        {
          condition: "ok",
          label: "Painel",
        },
      ],
      customerId: customer.customerId,
      damageNotes: "Sem avarias aparentes",
      enteredAt: "2026-07-24T13:15:00.000Z",
      expectedService: "Check-in direto auditavel",
      fuelLevel: "3/4",
      vehicleId: vehicle.vehicleId,
    });

    expect(response.status).toBe(201);

    const checkIn = ((await response.json()) as ApiData<CheckInBody>).data;
    const auditRows = await getAuditRows(prisma);

    expect(checkIn.appointmentId).toEqual(expect.any(String));
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "reception.appointments.trace_created",
        "reception.appointments.converted",
        "reception.checkins.created",
      ]),
    );
  });

  it("D-10/REC-08 audits later permitted check-in edits without storing attachment or note dumps", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Auditoria Edicao",
    });
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const response = await createCheckIn(headers, {
      checklistItems: [
        {
          condition: "ok",
          label: "Interior",
        },
      ],
      customerId: customer.customerId,
      damageNotes: "Observacao operacional extensa antes da edicao",
      enteredAt: "2026-07-24T14:15:00.000Z",
      fuelLevel: "1/4",
      vehicleId: vehicle.vehicleId,
    });

    expect(response.status).toBe(201);

    const checkIn = ((await response.json()) as ApiData<CheckInBody>).data;
    const editResponse = await fetch(`${baseUrl}/reception/check-ins/${checkIn.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        checklistItems: [
          {
            condition: "avaria",
            label: "Interior",
            notes: "Banco com rasgo registrado depois",
          },
        ],
        damageNotes: "Banco com rasgo registrado depois",
        itemsLeft: "Chave reserva",
      }),
    });

    expect(editResponse.status).toBe(200);

    const auditRows = await getAuditRows(prisma);
    expect(auditRows.map((row) => row.action)).toContain("reception.checkins.updated");
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toContain(
      "Observacao operacional extensa antes da edicao",
    );
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
