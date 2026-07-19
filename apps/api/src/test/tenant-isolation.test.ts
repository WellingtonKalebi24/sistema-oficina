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
    // keep isolation tests quiet while still exercising the app logger seam
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

describe("tenant isolation for admin APIs", () => {
  it("prevents tenant A from reading or mutating tenant B users, roles, settings and overrides", async () => {
    const tenantA = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina A",
    });
    const tenantB = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina B",
    });
    const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
    const sessionB = await loginAs({ baseUrl }, tenantB.adminEmail, tenantB.adminPassword);
    const headersA = {
      authorization: `Bearer ${sessionA.accessToken}`,
      "content-type": "application/json",
    };

    const tenantBRole = await prisma.role.create({
      data: {
        key: "tenant-b-role",
        name: "Tenant B Role",
        permissions: {
          create: {
            permission: {
              connect: {
                key: "users.read",
              },
            },
          },
        },
        tenantId: tenantB.tenantId,
      },
    });

    const listUsersAResponse = await fetch(`${baseUrl}/users`, {
      headers: {
        authorization: `Bearer ${sessionA.accessToken}`,
      },
    });

    expect(listUsersAResponse.status).toBe(200);

    const usersBody = (await listUsersAResponse.json()) as {
      data: Array<{ email: string; id: string; tenantId: string }>;
    };

    expect(usersBody.data.map((user) => user.email)).toContain(tenantA.adminEmail);
    expect(usersBody.data.map((user) => user.email)).not.toContain(tenantB.adminEmail);

    const updateTenantBSettingsResponse = await fetch(
      `${baseUrl}/tenant-settings?tenantId=${tenantB.tenantId}`,
      {
        method: "PUT",
        headers: headersA,
        body: JSON.stringify({
          tradeName: "Tentativa Cross Tenant",
        }),
      },
    );
    const patchTenantBUserResponse = await fetch(`${baseUrl}/users/${tenantB.adminId}`, {
      method: "PATCH",
      headers: headersA,
      body: JSON.stringify({
        name: "Cross Tenant",
      }),
    });
    const deactivateTenantBUserResponse = await fetch(
      `${baseUrl}/users/${tenantB.adminId}/deactivate`,
      {
        method: "POST",
        headers: headersA,
      },
    );
    const assignTenantBRoleResponse = await fetch(`${baseUrl}/users/${tenantA.adminId}/roles`, {
      method: "PUT",
      headers: headersA,
      body: JSON.stringify({
        roleIds: [tenantBRole.id],
      }),
    });
    const overrideTenantBUserResponse = await fetch(
      `${baseUrl}/users/${tenantB.adminId}/permission-overrides`,
      {
        method: "PUT",
        headers: headersA,
        body: JSON.stringify({
          overrides: [{ effect: "allow", permissionKey: "users.create" }],
        }),
      },
    );

    expect(updateTenantBSettingsResponse.status).toBe(200);
    expect(patchTenantBUserResponse.status).toBe(404);
    expect(deactivateTenantBUserResponse.status).toBe(404);
    expect(assignTenantBRoleResponse.status).toBe(400);
    expect(overrideTenantBUserResponse.status).toBe(404);

    const tenantBSettingsResponse = await fetch(`${baseUrl}/tenant-settings`, {
      headers: {
        authorization: `Bearer ${sessionB.accessToken}`,
      },
    });
    const settingsBody = (await tenantBSettingsResponse.json()) as {
      data: { tenantId: string; tradeName: string };
    };

    expect(settingsBody.data).toMatchObject({
      tenantId: tenantB.tenantId,
      tradeName: "Oficina B",
    });
  });
});
