import type { PrismaClient } from "@prisma/client";

export const DEFAULT_PERMISSION_KEYS = [
  "tenant.settings.read",
  "tenant.settings.update",
  "users.read",
  "users.create",
  "users.update",
  "users.deactivate",
  "users.createAdmin",
  "roles.manage",
  "permissions.manage",
  "audit.read",
] as const;

type IdentityPrisma = PrismaClient & Record<string, any>;

type HttpClient = {
  baseUrl: string;
};

export type TenantWithAdminFixture = {
  tenantId: string;
  adminId: string;
  adminEmail: string;
  adminPassword: string;
  adminRoleId: string;
};

export type UserWithRoleFixture = {
  userId: string;
  roleId: string;
  email: string;
  password: string;
};

export async function resetIdentityTables(prisma: PrismaClient): Promise<void> {
  const db = prisma as IdentityPrisma;

  await db.passwordResetToken.deleteMany();
  await db.session.deleteMany();
  await db.auditLog.deleteMany();
  await db.userPermissionOverride.deleteMany();
  await db.userRole.deleteMany();
  await db.rolePermission.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();
  await db.user.deleteMany();
  await db.companySetting.deleteMany();
  await db.tenant.deleteMany();
}

export async function createTenantWithAdmin(
  prisma: PrismaClient,
  overrides: Partial<{
    tenantName: string;
    document: string;
    email: string;
    passwordHash: string;
  }> = {},
): Promise<TenantWithAdminFixture> {
  const db = prisma as IdentityPrisma;
  const suffix = crypto.randomUUID();
  const tenant = await db.tenant.create({
    data: {
      name: overrides.tenantName ?? `Oficina ${suffix}`,
      document: overrides.document ?? `tenant-${suffix}`,
      status: "active",
      settings: {
        create: {
          legalName: overrides.tenantName ?? `Oficina ${suffix} Ltda`,
          tradeName: overrides.tenantName ?? `Oficina ${suffix}`,
          document: overrides.document ?? `tenant-${suffix}`,
          timezone: "America/Sao_Paulo",
          locale: "pt-BR",
        },
      },
    },
  });

  await seedPermissionRows(prisma);

  const role = await db.role.create({
    data: {
      tenantId: tenant.id,
      key: "admin",
      name: "Administrador",
      description: "Acesso administrativo completo",
      isSystem: true,
      permissions: {
        create: DEFAULT_PERMISSION_KEYS.map((permissionKey) => ({
          permission: {
            connect: {
              key: permissionKey,
            },
          },
        })),
      },
    },
  });

  const email = overrides.email ?? `admin-${suffix}@joia.test`;
  const admin = await db.user.create({
    data: {
      tenantId: tenant.id,
      name: "Administrador JO.IA",
      email,
      passwordHash: overrides.passwordHash ?? "test-password-hash",
      status: "active",
      roles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });

  return {
    tenantId: tenant.id,
    adminId: admin.id,
    adminEmail: email,
    adminPassword: "senha-admin-123",
    adminRoleId: role.id,
  };
}

export async function createUserWithRole(
  prisma: PrismaClient,
  tenantId: string,
  roleKey = "operator",
): Promise<UserWithRoleFixture> {
  const db = prisma as IdentityPrisma;
  const suffix = crypto.randomUUID();
  const role = await db.role.create({
    data: {
      tenantId,
      key: roleKey,
      name: "Operador",
      isSystem: false,
    },
  });
  const email = `user-${suffix}@joia.test`;
  const user = await db.user.create({
    data: {
      tenantId,
      name: "Operador JO.IA",
      email,
      passwordHash: "test-password-hash",
      status: "active",
      roles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });

  return {
    userId: user.id,
    roleId: role.id,
    email,
    password: "senha-user-123",
  };
}

export async function loginAs(
  client: HttpClient,
  email: string,
  password: string,
  userAgent = "vitest-session-client",
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const response = await fetch(`${client.baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": userAgent,
    },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json()) as {
    data?: { accessToken: string; refreshToken: string; sessionId: string };
  };

  if (!response.ok || !body.data) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  return body.data;
}

export async function getAuditPayloads(prisma: PrismaClient): Promise<unknown[]> {
  const db = prisma as IdentityPrisma;
  const rows = await db.auditLog.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  return rows.map((row: { payload: unknown }) => row.payload);
}

async function seedPermissionRows(prisma: PrismaClient): Promise<void> {
  const db = prisma as IdentityPrisma;

  for (const key of DEFAULT_PERMISSION_KEYS) {
    await db.permission.upsert({
      where: { key },
      create: {
        key,
        name: key,
        description: `Permissao ${key}`,
      },
      update: {
        name: key,
      },
    });
  }
}
