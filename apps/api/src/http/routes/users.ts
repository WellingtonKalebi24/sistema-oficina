import { Router, type Request } from "express";
import { z } from "zod";

import { hashPassword } from "../../auth/passwords.js";
import { writeAuditLog } from "../../audit/auditService.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { hasPermission } from "../../permissions/permissionService.js";
import {
  hasAdminLevelPermission,
  isPermissionKey,
  PERMISSIONS,
  type PermissionKey,
} from "../../permissions/permissions.js";
import {
  getRolePermissionKeys,
  requireTenantRoleIds,
  requireTenantUser,
} from "../../tenancy/tenantScope.js";
import { asyncHandler, badRequest, forbidden } from "../errors.js";
import { requirePermission } from "../middleware/requirePermission.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

const permissionOverrideSchema = z.object({
  effect: z.enum(["allow", "deny"]),
  permissionKey: z.string().refine(isPermissionKey, "Invalid permission key."),
  reason: z.string().trim().max(240).optional(),
});

const createUserSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
  permissionOverrides: z.array(permissionOverrideSchema).optional(),
  roleIds: z.array(z.string().min(1)).optional(),
});

const updateUserSchema = z.object({
  email: z
    .email()
    .transform((value) => value.toLowerCase())
    .optional(),
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const replaceRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)),
});

const replaceOverridesSchema = z.object({
  overrides: z.array(permissionOverrideSchema),
});

export function createUsersRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/users",
    requirePermission(prisma, PERMISSIONS.usersRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const users = await prisma.user.findMany({
        include: {
          permissionOverrides: {
            include: {
              permission: true,
            },
          },
          roles: {
            include: {
              role: true,
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
        data: users.map(serializeUser),
      });
    }),
  );

  router.post(
    "/users",
    requirePermission(prisma, PERMISSIONS.usersCreate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = createUserSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid user data.");
      }

      await ensureCanGrantRequestedAccess(prisma, auth.userId, auth.tenantId, {
        overridePermissionKeys: extractAllowPermissionKeys(parsed.data.permissionOverrides ?? []),
        roleIds: parsed.data.roleIds ?? [],
      });

      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: parsed.data.email,
            name: parsed.data.name,
            passwordHash: await hashPassword(parsed.data.password),
            status: "active",
            tenantId: auth.tenantId,
          },
        });

        if (parsed.data.roleIds?.length) {
          await requireTenantRoleIds(tx as PrismaDatabase, auth.tenantId, parsed.data.roleIds);
          await tx.userRole.createMany({
            data: [...new Set(parsed.data.roleIds)].map((roleId) => ({
              roleId,
              userId: created.id,
            })),
            skipDuplicates: true,
          });
        }

        if (parsed.data.permissionOverrides?.length) {
          await upsertPermissionOverrides(
            tx as PrismaDatabase,
            created.id,
            parsed.data.permissionOverrides,
          );
        }

        await writeAuditLog(tx as PrismaDatabase, {
          action: "users.created",
          entity: "user",
          ipAddress: req.ip,
          metadata: {
            email: created.email,
            roleCount: parsed.data.roleIds?.length ?? 0,
          },
          recordId: created.id,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        });

        return tx.user.findUniqueOrThrow({
          include: userInclude,
          where: {
            id: created.id,
          },
        });
      });

      res.status(201).json({
        data: serializeUser(user),
      });
    }),
  );

  router.patch(
    "/users/:userId",
    requirePermission(prisma, PERMISSIONS.usersUpdate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = updateUserSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid user data.");
      }

      const userId = readPathParam(req, "userId");
      await requireTenantUser(prisma, auth.tenantId, userId);
      const updateData: { deactivatedAt?: Date; email?: string; name?: string; status?: string } =
        {};

      if (parsed.data.email !== undefined) {
        updateData.email = parsed.data.email;
      }

      if (parsed.data.name !== undefined) {
        updateData.name = parsed.data.name;
      }

      if (parsed.data.status !== undefined) {
        updateData.status = parsed.data.status;

        if (parsed.data.status === "inactive") {
          updateData.deactivatedAt = new Date();
        }
      }

      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          data: updateData,
          include: userInclude,
          where: {
            id: userId,
          },
        });

        await writeAuditLog(tx as PrismaDatabase, {
          action: "users.updated",
          entity: "user",
          ipAddress: req.ip,
          metadata: {
            fields: Object.keys(parsed.data).sort(),
          },
          recordId: updated.id,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        });

        return updated;
      });

      res.json({
        data: serializeUser(user),
      });
    }),
  );

  router.post(
    "/users/:userId/deactivate",
    requirePermission(prisma, PERMISSIONS.usersDeactivate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const userId = readPathParam(req, "userId");
      await requireTenantUser(prisma, auth.tenantId, userId);

      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          data: {
            deactivatedAt: new Date(),
            status: "inactive",
          },
          include: userInclude,
          where: {
            id: userId,
          },
        });

        await writeAuditLog(tx as PrismaDatabase, {
          action: "users.deactivated",
          entity: "user",
          ipAddress: req.ip,
          recordId: updated.id,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        });

        return updated;
      });

      res.json({
        data: serializeUser(user),
      });
    }),
  );

  router.put(
    "/users/:userId/roles",
    requirePermission(prisma, PERMISSIONS.usersUpdate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = replaceRolesSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid role assignment data.");
      }

      const userId = readPathParam(req, "userId");
      await requireTenantUser(prisma, auth.tenantId, userId);
      await ensureCanGrantRequestedAccess(prisma, auth.userId, auth.tenantId, {
        overridePermissionKeys: [],
        roleIds: parsed.data.roleIds,
      });

      const user = await prisma.$transaction(async (tx) => {
        await requireTenantRoleIds(tx as PrismaDatabase, auth.tenantId, parsed.data.roleIds);
        await tx.userRole.deleteMany({
          where: {
            userId,
          },
        });
        await tx.userRole.createMany({
          data: [...new Set(parsed.data.roleIds)].map((roleId) => ({
            roleId,
            userId,
          })),
          skipDuplicates: true,
        });
        await writeAuditLog(tx as PrismaDatabase, {
          action: "users.roles.updated",
          entity: "user",
          ipAddress: req.ip,
          metadata: {
            roleIds: parsed.data.roleIds,
          },
          recordId: userId,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        });

        return tx.user.findUniqueOrThrow({
          include: userInclude,
          where: {
            id: userId,
          },
        });
      });

      res.json({
        data: serializeUser(user),
      });
    }),
  );

  router.put(
    "/users/:userId/permission-overrides",
    requirePermission(prisma, PERMISSIONS.permissionsManage),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = replaceOverridesSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid permission override data.");
      }

      const userId = readPathParam(req, "userId");
      await requireTenantUser(prisma, auth.tenantId, userId);
      await ensureCanGrantRequestedAccess(prisma, auth.userId, auth.tenantId, {
        overridePermissionKeys: extractAllowPermissionKeys(parsed.data.overrides),
        roleIds: [],
      });

      const user = await prisma.$transaction(async (tx) => {
        await tx.userPermissionOverride.deleteMany({
          where: {
            userId,
          },
        });
        await upsertPermissionOverrides(tx as PrismaDatabase, userId, parsed.data.overrides);
        await writeAuditLog(tx as PrismaDatabase, {
          action: "users.permission_overrides.updated",
          entity: "user",
          ipAddress: req.ip,
          metadata: {
            overrideCount: parsed.data.overrides.length,
          },
          recordId: userId,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        });

        return tx.user.findUniqueOrThrow({
          include: userInclude,
          where: {
            id: userId,
          },
        });
      });

      res.json({
        data: serializeUser(user),
      });
    }),
  );

  return router;
}

function readPathParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== "string" || !value) {
    throw badRequest("Missing route parameter.");
  }

  return value;
}

const userInclude = {
  permissionOverrides: {
    include: {
      permission: true,
    },
  },
  roles: {
    include: {
      role: true,
    },
  },
} as const;

async function ensureCanGrantRequestedAccess(
  prisma: PrismaDatabase,
  actorUserId: string,
  tenantId: string,
  input: { overridePermissionKeys: string[]; roleIds: string[] },
): Promise<void> {
  const rolePermissionKeys = await getRolePermissionKeys(prisma, tenantId, input.roleIds);
  const requestedPermissionKeys = [...rolePermissionKeys, ...input.overridePermissionKeys];

  if (
    hasAdminLevelPermission(requestedPermissionKeys) &&
    !(await hasPermission(prisma, actorUserId, PERMISSIONS.usersCreateAdmin))
  ) {
    throw forbidden("users.createAdmin is required for admin-level grants.");
  }
}

function extractAllowPermissionKeys(overrides: Array<{ effect: string; permissionKey: string }>) {
  return overrides
    .filter((override) => override.effect === "allow")
    .map((override) => override.permissionKey);
}

async function upsertPermissionOverrides(
  prisma: PrismaDatabase,
  userId: string,
  overrides: Array<{
    effect: "allow" | "deny";
    permissionKey: PermissionKey;
    reason?: string | undefined;
  }>,
): Promise<void> {
  for (const override of overrides) {
    const permission = await prisma.permission.findUnique({
      where: {
        key: override.permissionKey,
      },
    });

    if (!permission) {
      throw badRequest("Invalid permission key.");
    }

    await prisma.userPermissionOverride.upsert({
      create: {
        effect: override.effect,
        permissionId: permission.id,
        reason: override.reason ?? null,
        userId,
      },
      update: {
        effect: override.effect,
        reason: override.reason ?? null,
      },
      where: {
        userId_permissionId: {
          permissionId: permission.id,
          userId,
        },
      },
    });
  }
}

function serializeUser(user: {
  createdAt: Date;
  deactivatedAt: Date | null;
  email: string;
  id: string;
  name: string;
  permissionOverrides: Array<{
    effect: string;
    permission: { key: string };
    reason: string | null;
  }>;
  roles: Array<{ role: { id: string; key: string; name: string } }>;
  status: string;
  tenantId: string;
  updatedAt: Date;
}) {
  return {
    createdAt: user.createdAt.toISOString(),
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
    email: user.email,
    id: user.id,
    name: user.name,
    permissionOverrides: user.permissionOverrides.map((override) => ({
      effect: override.effect,
      permissionKey: override.permission.key,
      reason: override.reason,
    })),
    roles: user.roles.map((userRole) => ({
      id: userRole.role.id,
      key: userRole.role.key,
      name: userRole.role.name,
    })),
    status: user.status,
    tenantId: user.tenantId,
    updatedAt: user.updatedAt.toISOString(),
  };
}
