import { Router } from "express";
import { z } from "zod";

import { hashPassword } from "../../auth/passwords.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { asyncHandler, badRequest, HttpError } from "../errors.js";

const DEFAULT_PERMISSION_KEYS = [
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

const bootstrapSchema = z.object({
  admin: z.object({
    email: z.email().transform((value) => value.toLowerCase()),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(10).max(200),
  }),
  companySettings: z
    .object({
      document: z.string().trim().max(40).optional(),
      legalName: z.string().trim().max(180).optional(),
      locale: z.string().trim().min(2).max(20).optional(),
      timezone: z.string().trim().min(1).max(80).optional(),
      tradeName: z.string().trim().min(1).max(120).optional(),
    })
    .optional(),
  tenant: z.object({
    document: z.string().trim().max(40).optional(),
    name: z.string().trim().min(1).max(120),
  }),
});

type BootstrapResult = {
  admin: {
    email: string;
    id: string;
    permissions: string[];
    tenantId: string;
  };
  companySettings: {
    id: string;
    tenantId: string;
    tradeName: string;
  };
  tenant: {
    id: string;
    name: string;
  };
};

export function createBootstrapRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/bootstrap/status",
    asyncHandler(async (_req, res) => {
      res.json({
        data: {
          bootstrapped: await isBootstrapped(prisma),
        },
      });
    }),
  );

  router.post(
    ["/bootstrap/create-first-admin", "/auth/bootstrap"],
    asyncHandler(async (req, res) => {
      const parsed = bootstrapSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid bootstrap data.");
      }

      const result = await createFirstAdmin(prisma, parsed.data, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.status(201).json({
        data: result,
      });
    }),
  );

  return router;
}

async function createFirstAdmin(
  prisma: PrismaDatabase,
  input: z.infer<typeof bootstrapSchema>,
  metadata: { ipAddress: string | undefined; userAgent: string | undefined },
): Promise<BootstrapResult> {
  return prisma.$transaction(async (tx) => {
    const existingAdmin = await tx.user.findFirst({
      select: {
        id: true,
      },
    });

    if (existingAdmin) {
      throw new HttpError(409, "Bootstrap has already been completed.");
    }

    for (const permissionKey of DEFAULT_PERMISSION_KEYS) {
      await tx.permission.upsert({
        create: {
          description: `Permissao ${permissionKey}`,
          key: permissionKey,
          name: permissionKey,
        },
        update: {
          name: permissionKey,
        },
        where: {
          key: permissionKey,
        },
      });
    }

    const tenant = await tx.tenant.create({
      data: {
        document: input.tenant.document ?? null,
        name: input.tenant.name,
        status: "active",
      },
    });
    const companySettings = await tx.companySetting.create({
      data: {
        document: input.companySettings?.document ?? input.tenant.document ?? null,
        legalName: input.companySettings?.legalName ?? null,
        locale: input.companySettings?.locale ?? "pt-BR",
        tenantId: tenant.id,
        timezone: input.companySettings?.timezone ?? "America/Sao_Paulo",
        tradeName: input.companySettings?.tradeName ?? input.tenant.name,
      },
    });
    const role = await tx.role.create({
      data: {
        description: "Acesso administrativo completo",
        isSystem: true,
        key: "admin",
        name: "Administrador",
        permissions: {
          create: DEFAULT_PERMISSION_KEYS.map((permissionKey) => ({
            permission: {
              connect: {
                key: permissionKey,
              },
            },
          })),
        },
        tenantId: tenant.id,
      },
    });
    const admin = await tx.user.create({
      data: {
        email: input.admin.email,
        name: input.admin.name,
        passwordHash: await hashPassword(input.admin.password),
        roles: {
          create: {
            roleId: role.id,
          },
        },
        status: "active",
        tenantId: tenant.id,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "auth.bootstrap.created",
        entity: "tenant",
        ipAddress: metadata.ipAddress ?? null,
        payload: {
          action: "auth.bootstrap.created",
          adminEmail: admin.email,
          tenantName: tenant.name,
        },
        recordId: tenant.id,
        tenantId: tenant.id,
        userAgent: metadata.userAgent ?? null,
        userId: admin.id,
      },
    });

    return {
      admin: {
        email: admin.email,
        id: admin.id,
        permissions: [...DEFAULT_PERMISSION_KEYS],
        tenantId: admin.tenantId,
      },
      companySettings: {
        id: companySettings.id,
        tenantId: companySettings.tenantId,
        tradeName: companySettings.tradeName,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    };
  });
}

async function isBootstrapped(prisma: PrismaDatabase): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    select: {
      id: true,
    },
  });

  return Boolean(existingUser);
}
