import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { getAuditPayloads, resetIdentityTables } from "./testData.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep auth tests quiet while still exercising the app logger seam
  },
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

describe("auth bootstrap", () => {
  it("creates the first tenant, company settings and admin user with default permissions", async () => {
    const response = await fetch(`${baseUrl}/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenant: {
          name: "Oficina Piloto",
          document: "12.345.678/0001-90",
        },
        companySettings: {
          legalName: "Oficina Piloto Ltda",
          tradeName: "Oficina Piloto",
          document: "12.345.678/0001-90",
          timezone: "America/Sao_Paulo",
          locale: "pt-BR",
        },
        admin: {
          name: "Admin Piloto",
          email: "admin@oficinapiloto.test",
          password: "Senha-forte-123",
        },
      }),
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as {
      data: {
        tenant: { id: string; name: string };
        companySettings: { id: string; tenantId: string; tradeName: string };
        admin: { id: string; tenantId: string; email: string; permissions: string[] };
      };
    };

    expect(body.data.tenant).toMatchObject({ name: "Oficina Piloto" });
    expect(body.data.companySettings).toMatchObject({
      tenantId: body.data.tenant.id,
      tradeName: "Oficina Piloto",
    });
    expect(body.data.admin).toMatchObject({
      tenantId: body.data.tenant.id,
      email: "admin@oficinapiloto.test",
    });
    expect(body.data.admin.permissions).toEqual(
      expect.arrayContaining(["users.createAdmin", "permissions.manage", "audit.read"]),
    );
    expect(JSON.stringify(body)).not.toContain("Senha-forte-123");

    await expect(getAuditPayloads(prisma)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "auth.bootstrap.created",
          tenantName: "Oficina Piloto",
        }),
      ]),
    );
  });

  it("rejects a second bootstrap attempt after an admin already exists", async () => {
    const firstResponse = await fetch(`${baseUrl}/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenant: { name: "Oficina Inicial", document: "bootstrap-lock" },
        companySettings: { tradeName: "Oficina Inicial" },
        admin: {
          name: "Admin Inicial",
          email: "admin-inicial@joia.test",
          password: "Senha-forte-123",
        },
      }),
    });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await fetch(`${baseUrl}/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenant: { name: "Oficina Indevida", document: "bootstrap-locked" },
        companySettings: { tradeName: "Oficina Indevida" },
        admin: {
          name: "Admin Indevido",
          email: "admin-indevido@joia.test",
          password: "Senha-forte-123",
        },
      }),
    });

    const body = (await secondResponse.json()) as { message: string };

    expect(secondResponse.status).toBe(409);
    expect(body.message).toMatch(/bootstrap/i);
  });
});
