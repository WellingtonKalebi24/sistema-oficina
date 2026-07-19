import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "../auth/passwords.js";
import { createApp } from "../app.js";
import {
  createTenantWithAdmin,
  DEFAULT_PERMISSION_KEYS,
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
    // keep permission tests quiet while still exercising the app logger seam
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

describe("tenant admin permissions", () => {
  it("lets an authorized admin update settings and manage users, roles and overrides", async () => {
    const fixture = await createTenantWithAdmin(prisma, {
      tenantName: "Oficina Permissoes",
    });
    const adminSession = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const authHeaders = {
      authorization: `Bearer ${adminSession.accessToken}`,
      "content-type": "application/json",
    };

    const settingsResponse = await fetch(`${baseUrl}/tenant-settings`, {
      headers: {
        authorization: `Bearer ${adminSession.accessToken}`,
      },
    });
    const updateSettingsResponse = await fetch(`${baseUrl}/tenant-settings`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        legalName: "Oficina Permissoes Ltda",
        tradeName: "Oficina Permissoes Norte",
        timezone: "America/Sao_Paulo",
      }),
    });
    const createUserResponse = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: "mecanico@permissoes.test",
        name: "Mecanico Permissoes",
        password: "Senha-mecanico-123",
      }),
    });

    expect(settingsResponse.status).toBe(200);
    expect(updateSettingsResponse.status).toBe(200);
    expect(createUserResponse.status).toBe(201);

    const userBody = (await createUserResponse.json()) as {
      data: { email: string; id: string; passwordHash?: string; tenantId: string };
    };

    expect(userBody.data).toMatchObject({
      email: "mecanico@permissoes.test",
      tenantId: fixture.tenantId,
    });
    expect(JSON.stringify(userBody)).not.toContain("passwordHash");

    const roleResponse = await fetch(`${baseUrl}/roles`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        description: "Atendimento de oficina",
        key: "service-advisor",
        name: "Consultor",
        permissionKeys: ["tenant.settings.read", "users.read"],
      }),
    });

    expect(roleResponse.status).toBe(201);
    const roleBody = (await roleResponse.json()) as { data: { id: string; permissions: string[] } };
    expect(roleBody.data.permissions).toEqual(
      expect.arrayContaining(["tenant.settings.read", "users.read"]),
    );

    const assignRoleResponse = await fetch(`${baseUrl}/users/${userBody.data.id}/roles`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        roleIds: [roleBody.data.id],
      }),
    });
    const allowOverrideResponse = await fetch(
      `${baseUrl}/users/${userBody.data.id}/permission-overrides`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          overrides: [
            {
              effect: "allow",
              permissionKey: "users.create",
              reason: "temporary onboarding",
            },
          ],
        }),
      },
    );

    expect(assignRoleResponse.status).toBe(200);
    expect(allowOverrideResponse.status).toBe(200);

    const userSession = await loginAs({ baseUrl }, "mecanico@permissoes.test", "Senha-mecanico-123");
    const meResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        authorization: `Bearer ${userSession.accessToken}`,
      },
    });
    const meBody = (await meResponse.json()) as { data: { user: { permissions: string[] } } };

    expect(meBody.data.user.permissions).toEqual(expect.arrayContaining(["users.create"]));

    const auditActions = (await getAuditRows(prisma)).map((row) => row.action);
    expect(auditActions).toEqual(
      expect.arrayContaining([
        "tenant.settings.updated",
        "users.created",
        "roles.created",
        "users.roles.updated",
        "users.permission_overrides.updated",
      ]),
    );
  });

  it("denies missing permissions and requires users.createAdmin for admin-level grants", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const limited = await createLimitedUser(fixture.tenantId, ["users.create"]);
    const limitedSession = await loginAs({ baseUrl }, limited.email, limited.password);
    const adminSession = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
    const limitedHeaders = {
      authorization: `Bearer ${limitedSession.accessToken}`,
      "content-type": "application/json",
    };

    const missingUsersReadResponse = await fetch(`${baseUrl}/users`, {
      headers: {
        authorization: `Bearer ${limitedSession.accessToken}`,
      },
    });
    const createRegularResponse = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: limitedHeaders,
      body: JSON.stringify({
        email: "regular@permissoes.test",
        name: "Usuario Regular",
        password: "Senha-regular-123",
      }),
    });
    const createAdminResponse = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: limitedHeaders,
      body: JSON.stringify({
        email: "admin-grant@permissoes.test",
        name: "Admin Indevido",
        password: "Senha-admin-123",
        permissionOverrides: [{ effect: "allow", permissionKey: "users.createAdmin" }],
      }),
    });
    const createRoleWithAdminPermissionResponse = await fetch(`${baseUrl}/roles`, {
      method: "POST",
      headers: limitedHeaders,
      body: JSON.stringify({
        key: "bad-admin",
        name: "Admin Indevido",
        permissionKeys: ["users.createAdmin"],
      }),
    });

    expect(missingUsersReadResponse.status).toBe(403);
    expect(createRegularResponse.status).toBe(201);
    expect(createAdminResponse.status).toBe(403);
    expect(createRoleWithAdminPermissionResponse.status).toBe(403);

    const adminRoleResponse = await fetch(`${baseUrl}/roles`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminSession.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        key: "admin-delegado",
        name: "Admin Delegado",
        permissionKeys: ["users.createAdmin"],
      }),
    });

    expect(adminRoleResponse.status).toBe(201);
  });

  it("applies explicit deny overrides over role allows", async () => {
    const fixture = await createTenantWithAdmin(prisma);
    const adminSession = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);

    const createUserResponse = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminSession.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "deny@permissoes.test",
        name: "Usuario Deny",
        password: "Senha-deny-123",
        roleIds: [fixture.adminRoleId],
        permissionOverrides: [
          {
            effect: "deny",
            permissionKey: "users.create",
            reason: "block delegated creation",
          },
        ],
      }),
    });

    expect(createUserResponse.status).toBe(201);

    const deniedSession = await loginAs({ baseUrl }, "deny@permissoes.test", "Senha-deny-123");
    const meResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        authorization: `Bearer ${deniedSession.accessToken}`,
      },
    });
    const createUserWithDeniedPermissionResponse = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${deniedSession.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "blocked@permissoes.test",
        name: "Usuario Bloqueado",
        password: "Senha-blocked-123",
      }),
    });
    const meBody = (await meResponse.json()) as { data: { user: { permissions: string[] } } };

    expect(meResponse.status).toBe(200);
    expect(meBody.data.user.permissions).not.toContain("users.create");
    expect(createUserWithDeniedPermissionResponse.status).toBe(403);
  });
});

async function createLimitedUser(
  tenantId: string,
  permissionKeys: string[],
): Promise<{ email: string; password: string; userId: string }> {
  const suffix = crypto.randomUUID();
  const email = `limited-${suffix}@joia.test`;
  const password = "Senha-limited-123";
  const role = await prisma.role.create({
    data: {
      key: `limited-${suffix}`,
      name: "Limitado",
      permissions: {
        create: permissionKeys.map((permissionKey) => ({
          permission: {
            connect: {
              key: permissionKey,
            },
          },
        })),
      },
      tenantId,
    },
  });
  const user = await prisma.user.create({
    data: {
      email,
      name: "Usuario Limitado",
      passwordHash: await hashPassword(password),
      roles: {
        create: {
          roleId: role.id,
        },
      },
      tenantId,
    },
  });

  expect(DEFAULT_PERMISSION_KEYS).toContain("users.createAdmin");

  return {
    email,
    password,
    userId: user.id,
  };
}
