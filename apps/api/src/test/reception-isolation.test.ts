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
    // keep cross-tenant isolation tests quiet while exercising the logger path
  },
};

type ApiData<T> = {
  data: T;
};

type AppointmentBody = {
  customerId: string;
  id: string;
  status: "Agendado" | "Cancelado" | "Convertido";
  tenantId: string;
  vehicleId: string;
};

type CheckInBody = {
  appointmentId: string;
  checklistItems: Array<{
    condition: string;
    id: string;
    label: string;
    notes: string | null;
  }>;
  customerId: string;
  id: string;
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

describe("reception tenant isolation hardening", () => {
  it("REC-07 prevents tenant A from reading, editing, cancelling or converting tenant B appointments", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Isolamento A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Isolamento B",
    });
    const customerA = await createCustomerFixture(prisma, tenantA.tenantId);
    const vehicleA = await createVehicleFixture(prisma, tenantA.tenantId, customerA.customerId);
    const customerB = await createCustomerFixture(prisma, tenantB.tenantId);
    const vehicleB = await createVehicleFixture(prisma, tenantB.tenantId, customerB.customerId);
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const headersA = authHeaders(sessionA.accessToken);
    const headersB = authHeaders(sessionB.accessToken);
    const foreignAppointment = await createAppointment(headersB, {
      customerId: customerB.customerId,
      expectedService: "Servico tenant B",
      origin: "counter",
      startsAt: "2026-07-24T12:00:00.000Z",
      vehicleId: vehicleB.vehicleId,
    });

    const listA = await fetch(`${baseUrl}/reception/appointments?date=2026-07-24`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const editForeign = await fetch(
      `${baseUrl}/reception/appointments/${foreignAppointment.id}`,
      {
        method: "PATCH",
        headers: headersA,
        body: JSON.stringify({ expectedService: "Edicao indevida" }),
      },
    );
    const cancelForeign = await fetch(
      `${baseUrl}/reception/appointments/${foreignAppointment.id}/cancel`,
      {
        method: "POST",
        headers: headersA,
        body: JSON.stringify({ reason: "Cancelamento indevido" }),
      },
    );
    const convertForeign = await createCheckIn(headersA, {
      appointmentId: foreignAppointment.id,
      checklistItems: [{ condition: "ok", label: "Lataria" }],
      customerId: customerA.customerId,
      damageNotes: "Tentativa de conversao indevida",
      enteredAt: "2026-07-24T12:15:00.000Z",
      fuelLevel: "1/2",
      vehicleId: vehicleA.vehicleId,
    });

    expect(listA.status).toBe(200);
    expect(((await listA.json()) as ApiData<AppointmentBody[]>).data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: foreignAppointment.id })]),
    );
    expect(editForeign.status).toBe(404);
    expect(cancelForeign.status).toBe(404);
    expect(convertForeign.status).toBe(404);
  });

  it(
    "REC-07 prevents tenant A from reading or editing tenant B check-in and checklist records",
    async () => {
      const tenantA = await createTenantWithAdmin(prisma, {
        tenantName: "Oficina Check-in A",
      });
      const tenantB = await createTenantWithAdmin(prisma, {
        tenantName: "Oficina Check-in B",
      });
      const customerB = await createCustomerFixture(prisma, tenantB.tenantId);
      const vehicleB = await createVehicleFixture(prisma, tenantB.tenantId, customerB.customerId);
      const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
      const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
      const headersA = authHeaders(sessionA.accessToken);
      const headersB = authHeaders(sessionB.accessToken);
      const foreignCheckIn = await createCheckInAndRead(headersB, {
        checklistItems: [
          {
            condition: "avaria",
            label: "Parachoque",
            notes: "Risco visivel",
          },
        ],
        customerId: customerB.customerId,
        damageNotes: "Risco visivel no parachoque",
        enteredAt: "2026-07-24T13:15:00.000Z",
        fuelLevel: "3/4",
        vehicleId: vehicleB.vehicleId,
      });

      const listA = await fetch(`${baseUrl}/reception/check-ins?date=2026-07-24`, {
        headers: bearerHeaders(sessionA.accessToken),
      });
      const detailA = await fetch(`${baseUrl}/reception/check-ins/${foreignCheckIn.id}`, {
        headers: bearerHeaders(sessionA.accessToken),
      });
      const editA = await fetch(`${baseUrl}/reception/check-ins/${foreignCheckIn.id}`, {
        method: "PATCH",
        headers: headersA,
        body: JSON.stringify({
          checklistItems: [{ condition: "ok", label: "Parachoque" }],
          damageNotes: "Alteracao indevida",
          mileage: 999,
        }),
      });

      expect(listA.status).toBe(200);
      expect(((await listA.json()) as ApiData<CheckInBody[]>).data).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: foreignCheckIn.id })]),
      );
      expect(detailA.status).toBe(404);
      expect(editA.status).toBe(404);

      const detailB = await fetch(`${baseUrl}/reception/check-ins/${foreignCheckIn.id}`, {
        headers: bearerHeaders(sessionB.accessToken),
      });
      const bodyB = (await detailB.json()) as ApiData<CheckInBody>;

      expect(detailB.status).toBe(200);
      expect(bodyB.data.checklistItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            condition: "avaria",
            label: "Parachoque",
          }),
        ]),
      );
    },
    15_000,
  );
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

  return ((await response.json()) as ApiData<AppointmentBody>).data;
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

async function createCheckInAndRead(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<CheckInBody> {
  const response = await createCheckIn(headers, body);

  expect(response.status).toBe(201);

  return ((await response.json()) as ApiData<CheckInBody>).data;
}
