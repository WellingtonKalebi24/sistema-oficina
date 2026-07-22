import { Router } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import { createPurchase, serializePurchase } from "../../stock/purchaseService.js";
import {
  cancelStockReservation,
  createStockReservation,
  createStockAdjustment,
  createStockExit,
  listStockReservations,
  listStockMovements,
  serializeStockReservation,
  serializeStockMovement,
} from "../../stock/stockService.js";
import {
  createPurchaseSchema,
  createStockReservationSchema,
  createStockAdjustmentSchema,
  createStockExitSchema,
  stockFilterSchema,
} from "../../stock/stockSchemas.js";
import { asyncHandler, badRequest } from "../errors.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";

export function createStockMovementsRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.post(
    "/stock/purchases",
    requirePermission(prisma, PERMISSIONS.stockPurchasesCreate),
    asyncHandler(async (req, res) => {
      const input = parseRequest(createPurchaseSchema, req.body, "Invalid purchase data.");
      const purchase = await createPurchase(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializePurchase(purchase),
      });
    }),
  );

  router.get(
    "/stock/movements",
    requirePermission(prisma, PERMISSIONS.stockMovementsRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(stockFilterSchema, req.query, "Invalid stock movement filters.");
      const movements = await listStockMovements(prisma, auth.tenantId, filters);

      res.json({
        data: movements.map(serializeStockMovement),
      });
    }),
  );

  router.post(
    "/stock/exits",
    requirePermission(prisma, PERMISSIONS.stockExitsCreate),
    asyncHandler(async (req, res) => {
      const input = parseRequest(createStockExitSchema, req.body, "Invalid stock exit data.");
      const movement = await createStockExit(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeStockMovement(movement),
      });
    }),
  );

  router.get(
    "/stock/reservations",
    requirePermission(prisma, PERMISSIONS.stockMovementsRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(stockFilterSchema, req.query, "Invalid stock reservation filters.");
      const reservations = await listStockReservations(prisma, auth.tenantId, filters);

      res.json({
        data: reservations.map(serializeStockReservation),
      });
    }),
  );

  router.post(
    "/stock/reservations",
    requirePermission(prisma, PERMISSIONS.stockReservationsCreate),
    asyncHandler(async (req, res) => {
      const input = parseRequest(
        createStockReservationSchema,
        req.body,
        "Invalid stock reservation data.",
      );
      const reservation = await createStockReservation(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeStockReservation(reservation),
      });
    }),
  );

  router.post(
    "/stock/reservations/:reservationId/cancel",
    requirePermission(prisma, PERMISSIONS.stockReservationsCancel),
    asyncHandler(async (req, res) => {
      const reservationId = req.params.reservationId;

      if (typeof reservationId !== "string" || reservationId.trim() === "") {
        throw badRequest("Invalid stock reservation id.");
      }

      const reservation = await cancelStockReservation(
        prisma,
        actorFromRequest(req),
        reservationId,
      );

      res.json({
        data: serializeStockReservation(reservation),
      });
    }),
  );

  router.post(
    "/stock/adjustments",
    requirePermission(prisma, PERMISSIONS.stockAdjustmentsCreate),
    asyncHandler(async (req, res) => {
      const input = parseRequest(
        createStockAdjustmentSchema,
        req.body,
        "Invalid stock adjustment data.",
      );
      const movement = await createStockAdjustment(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeStockMovement(movement),
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
