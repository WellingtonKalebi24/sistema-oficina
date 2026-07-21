import { Router } from "express";

import {
  createCustomer,
  listCustomerHistory,
  listCustomers,
  readCustomer,
  readPathId,
  serializeCustomer,
  serializeHistoryEvent,
  softDeleteCustomer,
  updateCustomer,
} from "../../customers/customerService.js";
import {
  createCustomerSchema,
  customerFilterSchema,
  updateCustomerSchema,
} from "../../customers/customerSchemas.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import { asyncHandler, badRequest } from "../errors.js";
import { requirePermission } from "../middleware/requirePermission.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

export function createCustomersRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/customers",
    requirePermission(prisma, PERMISSIONS.customersRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = customerFilterSchema.safeParse(req.query);

      if (!parsed.success) {
        throw badRequest("Invalid customer filters.");
      }

      const customers = await listCustomers(prisma, auth.tenantId, parsed.data);

      res.json({
        data: customers.map(serializeCustomer),
      });
    }),
  );

  router.get(
    "/customers/:customerId",
    requirePermission(prisma, PERMISSIONS.customersRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const customerId = readPathId(req.params.customerId);
      const customer = await readCustomer(prisma, auth.tenantId, customerId);

      res.json({
        data: serializeCustomer(customer),
      });
    }),
  );

  router.get(
    "/customers/:customerId/history",
    requirePermission(prisma, PERMISSIONS.customersRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const customerId = readPathId(req.params.customerId);
      const history = await listCustomerHistory(prisma, auth.tenantId, customerId);

      res.json({
        data: history.map(serializeHistoryEvent),
      });
    }),
  );

  router.post(
    "/customers",
    requirePermission(prisma, PERMISSIONS.customersCreate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = createCustomerSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid customer data.");
      }

      const customer = await createCustomer(
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
        data: serializeCustomer(customer),
      });
    }),
  );

  router.patch(
    "/customers/:customerId",
    requirePermission(prisma, PERMISSIONS.customersUpdate),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const parsed = updateCustomerSchema.safeParse(req.body);

      if (!parsed.success) {
        throw badRequest("Invalid customer data.");
      }

      const customerId = readPathId(req.params.customerId);
      const customer = await updateCustomer(
        prisma,
        {
          ipAddress: req.ip,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        },
        customerId,
        parsed.data,
      );

      res.json({
        data: serializeCustomer(customer),
      });
    }),
  );

  router.delete(
    "/customers/:customerId",
    requirePermission(prisma, PERMISSIONS.customersDelete),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const customerId = readPathId(req.params.customerId);

      await softDeleteCustomer(
        prisma,
        {
          ipAddress: req.ip,
          tenantId: auth.tenantId,
          userAgent: req.get("user-agent"),
          userId: auth.userId,
        },
        customerId,
      );

      res.status(204).send();
    }),
  );

  return router;
}
