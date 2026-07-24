import { Router } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import {
  cancelAppointment,
  createAppointment,
  listAppointments,
  serializeAppointment,
  updateAppointment,
} from "../../reception/appointmentService.js";
import {
  appointmentListSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "../../reception/receptionSchemas.js";
import { readPathId } from "../../customers/customerService.js";
import { asyncHandler, badRequest } from "../errors.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";

export function createReceptionRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/reception/appointments",
    requirePermission(prisma, PERMISSIONS.receptionAppointmentsRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(
        appointmentListSchema,
        req.query,
        "Invalid appointment filters.",
      );
      const appointments = await listAppointments(prisma, auth.tenantId, filters);

      res.json({
        data: appointments.map(serializeAppointment),
      });
    }),
  );

  router.post(
    "/reception/appointments",
    requirePermission(prisma, PERMISSIONS.receptionAppointmentsWrite),
    asyncHandler(async (req, res) => {
      const input = parseRequest(createAppointmentSchema, req.body, "Invalid appointment data.");
      const appointment = await createAppointment(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeAppointment(appointment),
      });
    }),
  );

  router.patch(
    "/reception/appointments/:appointmentId",
    requirePermission(prisma, PERMISSIONS.receptionAppointmentsWrite),
    asyncHandler(async (req, res) => {
      const appointmentId = readPathId(req.params.appointmentId);
      const input = parseRequest(updateAppointmentSchema, req.body, "Invalid appointment data.");
      const appointment = await updateAppointment(
        prisma,
        actorFromRequest(req),
        appointmentId,
        input,
      );

      res.json({
        data: serializeAppointment(appointment),
      });
    }),
  );

  router.post(
    "/reception/appointments/:appointmentId/cancel",
    requirePermission(prisma, PERMISSIONS.receptionAppointmentsCancel),
    asyncHandler(async (req, res) => {
      const appointmentId = readPathId(req.params.appointmentId);
      const input = parseRequest(cancelAppointmentSchema, req.body, "Invalid cancellation data.");
      const appointment = await cancelAppointment(
        prisma,
        actorFromRequest(req),
        appointmentId,
        input,
      );

      res.json({
        data: serializeAppointment(appointment),
      });
    }),
  );

  return router;
}

function actorFromRequest(req: unknown) {
  const authenticatedReq = req as AuthenticatedRequest;

  return {
    ipAddress: authenticatedReq.ip,
    tenantId: authenticatedReq.auth.tenantId,
    userAgent: authenticatedReq.get("user-agent"),
    userId: authenticatedReq.auth.userId,
  };
}

function parseRequest<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  message: string,
): T {
  try {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      throw badRequest(message);
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === "HttpError") {
      throw error;
    }

    throw badRequest(message);
  }
}
