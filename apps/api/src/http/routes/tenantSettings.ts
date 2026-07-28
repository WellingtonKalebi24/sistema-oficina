import { Router } from "express";
import { z } from "zod";

import { writeAuditLog } from "../../audit/auditService.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import { asyncHandler, badRequest } from "../errors.js";
import { requirePermission } from "../middleware/requirePermission.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

const updateSettingsSchema = z.object({
  agendaViewMode: z.enum(["table", "calendar", "kanban"]).optional(),
  currencyCode: z.string().trim().min(3).max(3).optional(),
  document: z.string().trim().max(40).optional().nullable(),
  legalName: z.string().trim().max(180).optional().nullable(),
  locale: z.string().trim().min(2).max(20).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  tradeName: z.string().trim().min(1).max(120).optional(),
});

export function createTenantSettingsRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/tenant-settings",
    requirePermission(prisma, PERMISSIONS.tenantSettingsRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const settings = await prisma.companySetting.findUnique({
        where: {
          tenantId: auth.tenantId,
        },
      });

      if (!settings) {
        throw badRequest("Tenant settings are not configured.");
      }

      res.json({
        data: serializeSettings(settings),
      });
    }),
  );

  router.put(
    "/tenant-settings",
    requirePermission(prisma, PERMISSIONS.tenantSettingsUpdate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = updateSettingsSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid tenant settings data.");
      }

      const updateData = Object.fromEntries(
        Object.entries(parsed.data).filter(([, value]) => value !== undefined),
      );
      const settings = await prisma.$transaction(async (tx) => {
        const updated = await tx.companySetting.update({
          data: updateData,
          where: {
            tenantId: auth.tenantId,
          },
        });

        await writeAuditLog(tx as PrismaDatabase, {
          action: "tenant.settings.updated",
          entity: "company_setting",
          ipAddress: req.ip,
          metadata: {
            fields: Object.keys(updateData).sort(),
          },
          recordId: updated.id,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        });

        return updated;
      });

      res.json({
        data: serializeSettings(settings),
      });
    }),
  );

  return router;
}

function serializeSettings(settings: {
  agendaViewMode: string;
  currencyCode: string;
  document: string | null;
  id: string;
  legalName: string | null;
  locale: string;
  tenantId: string;
  timezone: string;
  tradeName: string;
  updatedAt: Date;
}) {
  return {
    agendaViewMode: settings.agendaViewMode,
    currencyCode: settings.currencyCode,
    document: settings.document,
    id: settings.id,
    legalName: settings.legalName,
    locale: settings.locale,
    tenantId: settings.tenantId,
    timezone: settings.timezone,
    tradeName: settings.tradeName,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
