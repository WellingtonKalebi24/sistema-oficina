import { Router } from "express";

import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleFilterSchema,
} from "../../customers/customerSchemas.js";
import { readPathId, serializeHistoryEvent } from "../../customers/customerService.js";
import {
  createVehicle,
  listVehicleHistory,
  listVehicles,
  readVehicle,
  serializeVehicle,
  softDeleteVehicle,
  updateVehicle,
} from "../../customers/vehicleService.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import { asyncHandler, badRequest } from "../errors.js";
import { requirePermission } from "../middleware/requirePermission.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

export function createVehiclesRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/vehicles",
    requirePermission(prisma, PERMISSIONS.vehiclesRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = vehicleFilterSchema.safeParse(req.query);

      if (!parsed.success) {
        throw badRequest("Invalid vehicle filters.");
      }

      const vehicles = await listVehicles(prisma, auth.tenantId, parsed.data);

      res.json({
        data: vehicles.map(serializeVehicle),
      });
    }),
  );

  router.get(
    "/vehicles/:vehicleId",
    requirePermission(prisma, PERMISSIONS.vehiclesRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const vehicleId = readPathId(req.params.vehicleId);
      const vehicle = await readVehicle(prisma, auth.tenantId, vehicleId);

      res.json({
        data: serializeVehicle(vehicle),
      });
    }),
  );

  router.get(
    "/vehicles/:vehicleId/history",
    requirePermission(prisma, PERMISSIONS.vehiclesRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const vehicleId = readPathId(req.params.vehicleId);
      const history = await listVehicleHistory(prisma, auth.tenantId, vehicleId);

      res.json({
        data: history.map(serializeHistoryEvent),
      });
    }),
  );

  router.post(
    "/vehicles",
    requirePermission(prisma, PERMISSIONS.vehiclesCreate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = safeParseVehicleData(createVehicleSchema, req.body);

      if (!parsed.success) {
        throw badRequest("Invalid vehicle data.");
      }

      const vehicle = await createVehicle(
        prisma,
        {
          ipAddress: req.ip,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        },
        parsed.data,
      );

      res.status(201).json({
        data: serializeVehicle(vehicle),
      });
    }),
  );

  router.patch(
    "/vehicles/:vehicleId",
    requirePermission(prisma, PERMISSIONS.vehiclesUpdate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = safeParseVehicleData(updateVehicleSchema, req.body);

      if (!parsed.success) {
        throw badRequest("Invalid vehicle data.");
      }

      const vehicleId = readPathId(req.params.vehicleId);
      const vehicle = await updateVehicle(
        prisma,
        {
          ipAddress: req.ip,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        },
        vehicleId,
        parsed.data,
      );

      res.json({
        data: serializeVehicle(vehicle),
      });
    }),
  );

  router.delete(
    "/vehicles/:vehicleId",
    requirePermission(prisma, PERMISSIONS.vehiclesDelete),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const vehicleId = readPathId(req.params.vehicleId);

      await softDeleteVehicle(
        prisma,
        {
          ipAddress: req.ip,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        },
        vehicleId,
      );

      res.status(204).send();
    }),
  );

  return router;
}

function safeParseVehicleData<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
): { success: true; data: T } | { success: false } {
  try {
    return schema.safeParse(value);
  } catch {
    return { success: false };
  }
}
