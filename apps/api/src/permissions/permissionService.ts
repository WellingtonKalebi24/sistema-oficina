import type { PrismaDatabase } from "../db/prisma.js";
import { type PermissionKey } from "./permissions.js";

export type EffectivePermissions = {
  denied: string[];
  permissions: string[];
};

export async function resolveEffectivePermissions(
  prisma: PrismaDatabase,
  userId: string,
): Promise<EffectivePermissions> {
  const user = await prisma.user.findUnique({
    include: {
      permissionOverrides: {
        include: {
          permission: true,
        },
      },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
    where: {
      id: userId,
    },
  });

  if (!user || user.status !== "active") {
    return {
      denied: [],
      permissions: [],
    };
  }

  const allowed = new Set<string>();
  const denied = new Set<string>();

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      allowed.add(rolePermission.permission.key);
    }
  }

  for (const override of user.permissionOverrides) {
    if (override.effect === "deny") {
      denied.add(override.permission.key);
      allowed.delete(override.permission.key);
      continue;
    }

    if (override.effect === "allow" && !denied.has(override.permission.key)) {
      allowed.add(override.permission.key);
    }
  }

  return {
    denied: [...denied].sort(),
    permissions: [...allowed].sort(),
  };
}

export async function hasPermission(
  prisma: PrismaDatabase,
  userId: string,
  permission: PermissionKey,
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(prisma, userId);

  return effective.permissions.includes(permission);
}
