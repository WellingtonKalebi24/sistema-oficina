import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { tmpdir } from "node:os";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import {
  createCustomerFixture,
  createTenantWithAdmin,
  createUserWithRole,
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
const uploadRoot = path.join(tmpdir(), `joia-reception-attachments-${process.pid}`);

let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep reception attachment tests quiet while exercising logger wiring
  },
};

type ApiData<T> = {
  data: T;
};

type AppointmentBody = {
  id: string;
};

type CheckInBody = {
  id: string;
};

type AttachmentBody = {
  category: "Avaria" | "Documento" | "Painel" | "Motor" | "Interior" | "Outro";
  checkInId: string;
  createdAt: string;
  deletedAt: string | null;
  id: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storedName: string;
  tenantId: string;
  uploadedByUserId: string | null;
};

beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;
  process.env.RECEPTION_UPLOAD_ROOT = uploadRoot;
  await mkdir(uploadRoot, { recursive: true });

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
  await rm(uploadRoot, { force: true, recursive: true });
  await mkdir(uploadRoot, { recursive: true });
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
  await rm(uploadRoot, { force: true, recursive: true });
});

describe("reception attachment API contract", () => {
  it("REC-05 uploads, lists, downloads and soft-deletes optional check-in attachments", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Anexos",
    });
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const checkIn = await createCheckInAndRead(headers, {
      checklistItems: [{ condition: "avaria", label: "Parachoque traseiro" }],
      customerId: customer.customerId,
      damageNotes: "Risco visivel no parachoque",
      enteredAt: "2026-07-24T12:15:00.000Z",
      fuelLevel: "1/2",
      vehicleId: vehicle.vehicleId,
    });

    const upload = await uploadAttachment(session.accessToken, checkIn.id, {
      category: "Avaria",
      filename: "../segredo/avaria.jpg",
      mimeType: "image/jpeg",
      text: "conteudo-foto-avaria",
    });

    expect(upload.status).toBe(201);

    const uploaded = ((await upload.json()) as ApiData<AttachmentBody>).data;
    const storedPath = path.join(uploadRoot, uploaded.storedName);

    expect(uploaded).toMatchObject({
      category: "Avaria",
      checkInId: checkIn.id,
      mimeType: "image/jpeg",
      sizeBytes: "conteudo-foto-avaria".length,
      tenantId: fixture.tenantId,
      uploadedByUserId: fixture.adminId,
    });
    expect(uploaded.originalName).toContain("avaria.jpg");
    expect(uploaded.storedName).not.toContain("..");
    expect(uploaded.storedName).not.toContain("segredo");
    expect(existsSync(storedPath)).toBe(true);

    const listResponse = await fetch(`${baseUrl}/reception/check-ins/${checkIn.id}/attachments`, {
      headers: bearerHeaders(session.accessToken),
    });
    const downloadResponse = await fetch(
      `${baseUrl}/reception/check-ins/${checkIn.id}/attachments/${uploaded.id}/download`,
      {
        headers: bearerHeaders(session.accessToken),
      },
    );
    const publicStaticResponse = await fetch(`${baseUrl}/uploads/reception/${uploaded.storedName}`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(listResponse.status).toBe(200);
    expect(downloadResponse.status).toBe(200);
    expect(publicStaticResponse.status).not.toBe(200);

    const list = (await listResponse.json()) as ApiData<AttachmentBody[]>;
    expect(list.data).toEqual([
      expect.objectContaining({
        category: "Avaria",
        id: uploaded.id,
      }),
    ]);
    expect(await downloadResponse.text()).toBe("conteudo-foto-avaria");

    const deleteResponse = await fetch(
      `${baseUrl}/reception/check-ins/${checkIn.id}/attachments/${uploaded.id}`,
      {
        method: "DELETE",
        headers: bearerHeaders(session.accessToken),
      },
    );

    expect(deleteResponse.status).toBe(204);
    expect(existsSync(storedPath)).toBe(false);

    const listAfterDelete = await fetch(`${baseUrl}/reception/check-ins/${checkIn.id}/attachments`, {
      headers: bearerHeaders(session.accessToken),
    });
    const downloadAfterDelete = await fetch(
      `${baseUrl}/reception/check-ins/${checkIn.id}/attachments/${uploaded.id}/download`,
      {
        headers: bearerHeaders(session.accessToken),
      },
    );
    const deletedRow = await prisma.checkInAttachment.findUniqueOrThrow({
      where: {
        id: uploaded.id,
      },
    });

    expect(((await listAfterDelete.json()) as ApiData<AttachmentBody[]>).data).toEqual([]);
    expect(downloadAfterDelete.status).toBe(404);
    expect(deletedRow.deletedAt).toBeInstanceOf(Date);
    expect(deletedRow.deletedByUserId).toBe(fixture.adminId);
  });

  it("REC-05 accepts canonical D-09 categories without blocking check-in completion", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const headers = authHeaders(session.accessToken);
    const checkIn = await createCheckInAndRead(headers, {
      checklistItems: [{ condition: "ok", label: "Painel" }],
      customerId: customer.customerId,
      damageNotes: "Sem avarias aparentes",
      enteredAt: "2026-07-24T13:15:00.000Z",
      fuelLevel: "3/4",
      vehicleId: vehicle.vehicleId,
    });

    const emptyList = await fetch(`${baseUrl}/reception/check-ins/${checkIn.id}/attachments`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(emptyList.status).toBe(200);
    expect(((await emptyList.json()) as ApiData<AttachmentBody[]>).data).toEqual([]);

    for (const category of ["Documento", "Painel", "Motor", "Interior", "Outro"] as const) {
      const response = await uploadAttachment(session.accessToken, checkIn.id, {
        category,
        filename: `${category}.txt`,
        mimeType: "text/plain",
        text: `arquivo-${category}`,
      });

      expect(response.status).toBe(201);
    }

    const list = await fetch(`${baseUrl}/reception/check-ins/${checkIn.id}/attachments`, {
      headers: bearerHeaders(session.accessToken),
    });

    expect(((await list.json()) as ApiData<AttachmentBody[]>).data.map((item) => item.category)).toEqual([
      "Documento",
      "Painel",
      "Motor",
      "Interior",
      "Outro",
    ]);
  });

  it("REC-07 blocks cross-tenant list, download and delete without exposing metadata or bytes", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Anexos A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Anexos B",
    });
    const customerB = await createCustomerFixture(prisma, tenantB.tenantId);
    const vehicleB = await createVehicleFixture(prisma, tenantB.tenantId, customerB.customerId);
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const checkInB = await createCheckInAndRead(authHeaders(sessionB.accessToken), {
      checklistItems: [{ condition: "ok", label: "Motor" }],
      customerId: customerB.customerId,
      damageNotes: "Sem vazamentos",
      enteredAt: "2026-07-24T14:15:00.000Z",
      fuelLevel: "1/4",
      vehicleId: vehicleB.vehicleId,
    });
    const uploadB = await uploadAttachment(sessionB.accessToken, checkInB.id, {
      category: "Motor",
      filename: "motor.txt",
      mimeType: "text/plain",
      text: "arquivo-tenant-b",
    });

    expect(uploadB.status).toBe(201);

    const attachmentB = ((await uploadB.json()) as ApiData<AttachmentBody>).data;

    const listA = await fetch(`${baseUrl}/reception/check-ins/${checkInB.id}/attachments`, {
      headers: bearerHeaders(sessionA.accessToken),
    });
    const downloadA = await fetch(
      `${baseUrl}/reception/check-ins/${checkInB.id}/attachments/${attachmentB.id}/download`,
      {
        headers: bearerHeaders(sessionA.accessToken),
      },
    );
    const deleteA = await fetch(
      `${baseUrl}/reception/check-ins/${checkInB.id}/attachments/${attachmentB.id}`,
      {
        method: "DELETE",
        headers: bearerHeaders(sessionA.accessToken),
      },
    );

    expect(listA.status).toBe(404);
    expect(downloadA.status).toBe(404);
    expect(deleteA.status).toBe(404);
    expect(await downloadA.text()).not.toContain("arquivo-tenant-b");
  });

  it("D-11 enforces separate backend permissions for attachment read, write and delete", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const limited = await createUserWithRole(prisma, fixture.tenantId);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const adminSession = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const limitedSession = await loginAs({ baseUrl }, limited.email, limited.password);
    const checkIn = await createCheckInAndRead(authHeaders(adminSession.accessToken), {
      checklistItems: [{ condition: "ok", label: "Documento" }],
      customerId: customer.customerId,
      damageNotes: "Documento recebido",
      enteredAt: "2026-07-24T15:15:00.000Z",
      fuelLevel: "1/2",
      vehicleId: vehicle.vehicleId,
    });
    const upload = await uploadAttachment(adminSession.accessToken, checkIn.id, {
      category: "Documento",
      filename: "documento.txt",
      mimeType: "text/plain",
      text: "documento-admin",
    });

    expect(upload.status).toBe(201);

    const attachment = ((await upload.json()) as ApiData<AttachmentBody>).data;

    const deniedList = await fetch(`${baseUrl}/reception/check-ins/${checkIn.id}/attachments`, {
      headers: bearerHeaders(limitedSession.accessToken),
    });
    const deniedUpload = await uploadAttachment(limitedSession.accessToken, checkIn.id, {
      category: "Documento",
      filename: "tentativa.txt",
      mimeType: "text/plain",
      text: "sem-permissao",
    });
    const deniedDelete = await fetch(
      `${baseUrl}/reception/check-ins/${checkIn.id}/attachments/${attachment.id}`,
      {
        method: "DELETE",
        headers: bearerHeaders(limitedSession.accessToken),
      },
    );

    expect(deniedList.status).toBe(403);
    expect(deniedUpload.status).toBe(403);
    expect(deniedDelete.status).toBe(403);
  });

  it("REC-08 audits upload and delete with metadata only", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const customer = await createCustomerFixture(prisma, fixture.tenantId);
    const vehicle = await createVehicleFixture(prisma, fixture.tenantId, customer.customerId);
    const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const checkIn = await createCheckInAndRead(authHeaders(session.accessToken), {
      checklistItems: [{ condition: "ok", label: "Interior" }],
      customerId: customer.customerId,
      damageNotes: "Interior sem avarias",
      enteredAt: "2026-07-24T16:15:00.000Z",
      fuelLevel: "1/2",
      vehicleId: vehicle.vehicleId,
    });
    const upload = await uploadAttachment(session.accessToken, checkIn.id, {
      category: "Interior",
      filename: "interior.txt",
      mimeType: "text/plain",
      text: "conteudo-sensivel-do-arquivo",
    });

    expect(upload.status).toBe(201);

    const attachment = ((await upload.json()) as ApiData<AttachmentBody>).data;

    await fetch(`${baseUrl}/reception/check-ins/${checkIn.id}/attachments/${attachment.id}`, {
      method: "DELETE",
      headers: bearerHeaders(session.accessToken),
    });

    const auditRows = await getAuditRows(prisma);

    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "reception.attachments.uploaded",
        "reception.attachments.deleted",
      ]),
    );
    expect(auditRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "check_in_attachment",
          recordId: attachment.id,
          tenantId: fixture.tenantId,
          userId: fixture.adminId,
        }),
      ]),
    );
    expect(JSON.stringify(auditRows.map((row) => row.payload))).not.toContain(
      "conteudo-sensivel-do-arquivo",
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

  return ((await response.json()) as ApiData<AppointmentBody>).data;
}

async function createCheckInAndRead(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<CheckInBody> {
  const appointment = await createAppointment(headers, {
    customerId: body.customerId,
    expectedService: "Recepcao de anexos",
    origin: "counter",
    startsAt: body.enteredAt,
    vehicleId: body.vehicleId,
  });
  const response = await fetch(`${baseUrl}/reception/check-ins`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...body,
      appointmentId: appointment.id,
    }),
  });

  expect(response.status).toBe(201);

  return ((await response.json()) as ApiData<CheckInBody>).data;
}

async function uploadAttachment(
  accessToken: string,
  checkInId: string,
  input: {
    category: AttachmentBody["category"];
    filename: string;
    mimeType: string;
    text: string;
  },
): Promise<Response> {
  const formData = new FormData();
  formData.set("category", input.category);
  formData.set("file", new Blob([input.text], { type: input.mimeType }), input.filename);

  return fetch(`${baseUrl}/reception/check-ins/${checkInId}/attachments`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    body: formData,
  });
}
