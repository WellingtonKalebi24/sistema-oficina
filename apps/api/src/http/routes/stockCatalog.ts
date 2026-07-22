import { Router } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import {
  createProduct,
  createProductCategory,
  createServiceCatalogEntry,
  createSupplier,
  deactivateProduct,
  deactivateProductCategory,
  deactivateServiceCatalogEntry,
  deactivateSupplier,
  listProductCategories,
  listProducts,
  listServiceCatalogEntries,
  listSuppliers,
  readProduct,
  readProductCategory,
  readServiceCatalogEntry,
  readSupplier,
  serializeProduct,
  serializeProductCategory,
  serializeServiceCatalogEntry,
  serializeSupplier,
  updateProduct,
  updateProductCategory,
  updateServiceCatalogEntry,
  updateSupplier,
} from "../../stock/catalogService.js";
import {
  createProductCategorySchema,
  createProductSchema,
  createServiceCatalogEntrySchema,
  createSupplierSchema,
  stockFilterSchema,
  updateProductCategorySchema,
  updateProductSchema,
  updateServiceCatalogEntrySchema,
  updateSupplierSchema,
} from "../../stock/stockSchemas.js";
import { asyncHandler, badRequest } from "../errors.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";

export function createStockCatalogRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/stock/services",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(stockFilterSchema, req.query, "Invalid stock filters.");
      const services = await listServiceCatalogEntries(prisma, auth.tenantId, filters);

      res.json({
        data: services.map(serializeServiceCatalogEntry),
      });
    }),
  );

  router.get(
    "/stock/services/:serviceId",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const serviceId = readPathId(req.params.serviceId);
      const service = await readServiceCatalogEntry(prisma, auth.tenantId, serviceId);

      res.json({
        data: serializeServiceCatalogEntry(service),
      });
    }),
  );

  router.post(
    "/stock/services",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const input = parseRequest(
        createServiceCatalogEntrySchema,
        req.body,
        "Invalid service catalog data.",
      );
      const service = await createServiceCatalogEntry(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeServiceCatalogEntry(service),
      });
    }),
  );

  router.patch(
    "/stock/services/:serviceId",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const serviceId = readPathId(req.params.serviceId);
      const input = parseRequest(
        updateServiceCatalogEntrySchema,
        req.body,
        "Invalid service catalog data.",
      );
      const service = await updateServiceCatalogEntry(
        prisma,
        actorFromRequest(req),
        serviceId,
        input,
      );

      res.json({
        data: serializeServiceCatalogEntry(service),
      });
    }),
  );

  router.delete(
    "/stock/services/:serviceId",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const serviceId = readPathId(req.params.serviceId);

      await deactivateServiceCatalogEntry(prisma, actorFromRequest(req), serviceId);

      res.status(204).send();
    }),
  );

  router.get(
    "/stock/categories",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(stockFilterSchema, req.query, "Invalid stock filters.");
      const categories = await listProductCategories(prisma, auth.tenantId, filters);

      res.json({
        data: categories.map(serializeProductCategory),
      });
    }),
  );

  router.get(
    "/stock/categories/:categoryId",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const categoryId = readPathId(req.params.categoryId);
      const category = await readProductCategory(prisma, auth.tenantId, categoryId);

      res.json({
        data: serializeProductCategory(category),
      });
    }),
  );

  router.post(
    "/stock/categories",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const input = parseRequest(
        createProductCategorySchema,
        req.body,
        "Invalid product category data.",
      );
      const category = await createProductCategory(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeProductCategory(category),
      });
    }),
  );

  router.patch(
    "/stock/categories/:categoryId",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const categoryId = readPathId(req.params.categoryId);
      const input = parseRequest(
        updateProductCategorySchema,
        req.body,
        "Invalid product category data.",
      );
      const category = await updateProductCategory(prisma, actorFromRequest(req), categoryId, input);

      res.json({
        data: serializeProductCategory(category),
      });
    }),
  );

  router.delete(
    "/stock/categories/:categoryId",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const categoryId = readPathId(req.params.categoryId);

      await deactivateProductCategory(prisma, actorFromRequest(req), categoryId);

      res.status(204).send();
    }),
  );

  router.get(
    "/stock/products",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(stockFilterSchema, req.query, "Invalid stock filters.");
      const products = await listProducts(prisma, auth.tenantId, filters);

      res.json({
        data: products.map(serializeProduct),
      });
    }),
  );

  router.get(
    "/stock/products/:productId",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const productId = readPathId(req.params.productId);
      const product = await readProduct(prisma, auth.tenantId, productId);

      res.json({
        data: serializeProduct(product),
      });
    }),
  );

  router.post(
    "/stock/products",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const input = parseRequest(createProductSchema, req.body, "Invalid product data.");
      const product = await createProduct(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeProduct(product),
      });
    }),
  );

  router.patch(
    "/stock/products/:productId",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const productId = readPathId(req.params.productId);
      const input = parseRequest(updateProductSchema, req.body, "Invalid product data.");
      const product = await updateProduct(prisma, actorFromRequest(req), productId, input);

      res.json({
        data: serializeProduct(product),
      });
    }),
  );

  router.delete(
    "/stock/products/:productId",
    requirePermission(prisma, PERMISSIONS.stockCatalogWrite),
    asyncHandler(async (req, res) => {
      const productId = readPathId(req.params.productId);

      await deactivateProduct(prisma, actorFromRequest(req), productId);

      res.status(204).send();
    }),
  );

  router.get(
    "/stock/suppliers",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(stockFilterSchema, req.query, "Invalid stock filters.");
      const suppliers = await listSuppliers(prisma, auth.tenantId, filters);

      res.json({
        data: suppliers.map(serializeSupplier),
      });
    }),
  );

  router.get(
    "/stock/suppliers/:supplierId",
    requirePermission(prisma, PERMISSIONS.stockCatalogRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const supplierId = readPathId(req.params.supplierId);
      const supplier = await readSupplier(prisma, auth.tenantId, supplierId);

      res.json({
        data: serializeSupplier(supplier),
      });
    }),
  );

  router.post(
    "/stock/suppliers",
    requirePermission(prisma, PERMISSIONS.stockSuppliersWrite),
    asyncHandler(async (req, res) => {
      const input = parseRequest(createSupplierSchema, req.body, "Invalid supplier data.");
      const supplier = await createSupplier(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeSupplier(supplier),
      });
    }),
  );

  router.patch(
    "/stock/suppliers/:supplierId",
    requirePermission(prisma, PERMISSIONS.stockSuppliersWrite),
    asyncHandler(async (req, res) => {
      const supplierId = readPathId(req.params.supplierId);
      const input = parseRequest(updateSupplierSchema, req.body, "Invalid supplier data.");
      const supplier = await updateSupplier(prisma, actorFromRequest(req), supplierId, input);

      res.json({
        data: serializeSupplier(supplier),
      });
    }),
  );

  router.delete(
    "/stock/suppliers/:supplierId",
    requirePermission(prisma, PERMISSIONS.stockSuppliersWrite),
    asyncHandler(async (req, res) => {
      const supplierId = readPathId(req.params.supplierId);

      await deactivateSupplier(prisma, actorFromRequest(req), supplierId);

      res.status(204).send();
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

function readPathId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw badRequest("Invalid resource ID.");
  }

  return value;
}
