import { Router } from "express";
import { z } from "zod";

import { writeAuditLog } from "../../audit/auditService.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { hasPermission } from "../../permissions/permissionService.js";
import {
  ALL_PERMISSIONS,
  hasAdminLevelPermission,
  isPermissionKey,
  PERMISSION_DETAILS,
  PERMISSIONS,
  type PermissionKey,
} from "../../permissions/permissions.js";
import { asyncHandler, badRequest, forbidden } from "../errors.js";
import { requirePermission } from "../middleware/requirePermission.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

const createRoleSchema = z.object({
  description: z.string().trim().max(240).optional(),
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9._-]+$/),
  name: z.string().trim().min(1).max(120),
  permissionKeys: z.array(z.string().refine(isPermissionKey, "Invalid permission key.")),
});

export function createRolesRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/permissions",
    requirePermission(prisma, PERMISSIONS.permissionsManage),
    asyncHandler(async (_req, res) => {
      res.json({
        data: ALL_PERMISSIONS.map((permissionKey) => ({
          description: PERMISSION_DETAILS[permissionKey].description,
          key: permissionKey,
          name: PERMISSION_DETAILS[permissionKey].name,
        })),
      });
    }),
  );

  router.get(
    "/roles",
    requirePermission(prisma, PERMISSIONS.rolesManage),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const roles = await prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        where: {
          tenantId: auth.tenantId,
        },
      });

      res.json({
        data: roles.map(serializeRole),
      });
    }),
  );

  router.post(
    "/roles",
    requirePermission(prisma, PERMISSIONS.rolesManage),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = createRoleSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid role data.");
      }

      await ensureCanGrantPermissionKeys(prisma, auth.userId, parsed.data.permissionKeys);

      const role = await prisma.$transaction(async (tx) => {
        const permissionRows = await tx.permission.findMany({
          select: {
            id: true,
            key: true,
          },
          where: {
            key: {
              in: [...new Set(parsed.data.permissionKeys)],
            },
          },
        });

        if (permissionRows.length !== new Set(parsed.data.permissionKeys).size) {
          throw badRequest("Invalid role permission data.");
        }

        const created = await tx.role.create({
          data: {
            description: parsed.data.description ?? null,
            key: parsed.data.key,
            name: parsed.data.name,
            tenantId: auth.tenantId,
          },
        });

        await tx.rolePermission.createMany({
          data: permissionRows.map((permission) => ({
            permissionId: permission.id,
            roleId: created.id,
          })),
          skipDuplicates: true,
        });

        await writeAuditLog(tx as PrismaDatabase, {
          action: "roles.created",
          entity: "role",
          ipAddress: req.ip,
          metadata: {
            key: created.key,
            permissionKeys: parsed.data.permissionKeys,
          },
          recordId: created.id,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        });

        return tx.role.findUniqueOrThrow({
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
          where: {
            id: created.id,
          },
        });
      });

      res.status(201).json({
        data: serializeRole(role),
      });
    }),
  );

  return router;
}

async function ensureCanGrantPermissionKeys(
  prisma: PrismaDatabase,
  actorUserId: string,
  permissionKeys: PermissionKey[],
): Promise<void> {
  if (
    hasAdminLevelPermission(permissionKeys) &&
    !(await hasPermission(prisma, actorUserId, PERMISSIONS.usersCreateAdmin))
  ) {
    throw forbidden("users.createAdmin is required for admin-level grants.");
  }
}

function serializeRole(role: {
  createdAt: Date;
  description: string | null;
  id: string;
  isSystem: boolean;
  key: string;
  name: string;
  permissions: Array<{ permission: { key: string } }>;
  tenantId: string;
  updatedAt: Date;
}) {
  return {
    createdAt: role.createdAt.toISOString(),
    description: role.description,
    id: role.id,
    isSystem: role.isSystem,
    key: role.key,
    name: role.name,
    permissions: role.permissions.map((rolePermission) => rolePermission.permission.key).sort(),
    tenantId: role.tenantId,
    updatedAt: role.updatedAt.toISOString(),
  };
}
