import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";

export function notFound(message = "Resource not found."): HttpError {
  return new HttpError(404, message);
}

export async function requireTenantUser(
  prisma: PrismaDatabase,
  tenantId: string,
  userId: string,
): Promise<{
  email: string;
  id: string;
  name: string;
  status: string;
  tenantId: string;
}> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
    },
  });

  if (!user) {
    throw notFound();
  }

  return user;
}

export async function requireTenantRoleIds(
  prisma: PrismaDatabase,
  tenantId: string,
  roleIds: string[],
): Promise<void> {
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length === 0) {
    return;
  }

  const roles = await prisma.role.findMany({
    select: {
      id: true,
    },
    where: {
      id: {
        in: uniqueRoleIds,
      },
      tenantId,
    },
  });

  if (roles.length !== uniqueRoleIds.length) {
    throw badRequest("All role IDs must belong to the authenticated tenant.");
  }
}

export async function getRolePermissionKeys(
  prisma: PrismaDatabase,
  tenantId: string,
  roleIds: string[],
): Promise<string[]> {
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length === 0) {
    return [];
  }

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    where: {
      id: {
        in: uniqueRoleIds,
      },
      tenantId,
    },
  });

  if (roles.length !== uniqueRoleIds.length) {
    throw badRequest("All role IDs must belong to the authenticated tenant.");
  }

  return roles.flatMap((role) =>
    role.permissions.map((rolePermission) => rolePermission.permission.key),
  );
}
