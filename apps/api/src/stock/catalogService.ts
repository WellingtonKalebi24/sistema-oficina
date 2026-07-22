import {
  Prisma,
  type Product,
  type ProductCategory,
  type ServiceCatalogEntry,
  type Supplier,
} from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { HttpError } from "../http/errors.js";
import { notFound } from "../tenancy/tenantScope.js";
import type {
  CreateProductCategoryInput,
  CreateProductInput,
  CreateServiceCatalogEntryInput,
  CreateSupplierInput,
  StockFilters,
  UpdateProductCategoryInput,
  UpdateProductInput,
  UpdateServiceCatalogEntryInput,
  UpdateSupplierInput,
} from "./stockSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

type ProductWithRelations = Product & {
  category?: {
    id: string;
    name: string;
  };
  stock?: {
    physicalQuantity: number;
    reservedQuantity: number;
  } | null;
};

export async function listServiceCatalogEntries(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: StockFilters,
): Promise<ServiceCatalogEntry[]> {
  return prisma.serviceCatalogEntry.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    where: {
      deactivatedAt: null,
      tenantId,
      ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    },
  });
}

export async function readServiceCatalogEntry(
  prisma: PrismaDatabase,
  tenantId: string,
  serviceId: string,
): Promise<ServiceCatalogEntry> {
  const service = await prisma.serviceCatalogEntry.findFirst({
    where: {
      deactivatedAt: null,
      id: serviceId,
      tenantId,
    },
  });

  if (!service) {
    throw notFound();
  }

  return service;
}

export async function createServiceCatalogEntry(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateServiceCatalogEntryInput,
): Promise<ServiceCatalogEntry> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.serviceCatalogEntry.create({
      data: {
        basePrice: new Prisma.Decimal(input.basePrice),
        description: input.description,
        name: input.name,
        tenantId: actor.tenantId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.services.created",
      entity: "service_catalog_entry",
      fields: compactFields(input),
      recordId: created.id,
    });

    return created;
  });
}

export async function updateServiceCatalogEntry(
  prisma: PrismaDatabase,
  actor: ActorContext,
  serviceId: string,
  input: UpdateServiceCatalogEntryInput,
): Promise<ServiceCatalogEntry> {
  await readServiceCatalogEntry(prisma, actor.tenantId, serviceId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.serviceCatalogEntry.update({
      data: {
        ...(Object.hasOwn(input, "basePrice") && input.basePrice !== undefined
          ? { basePrice: new Prisma.Decimal(input.basePrice) }
          : {}),
        ...(Object.hasOwn(input, "description") ? { description: input.description } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
      },
      where: {
        id: serviceId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.services.updated",
      entity: "service_catalog_entry",
      fields: compactFields(input),
      recordId: updated.id,
    });

    return updated;
  });
}

export async function deactivateServiceCatalogEntry(
  prisma: PrismaDatabase,
  actor: ActorContext,
  serviceId: string,
): Promise<void> {
  await readServiceCatalogEntry(prisma, actor.tenantId, serviceId);

  await prisma.$transaction(async (tx) => {
    await tx.serviceCatalogEntry.update({
      data: {
        deactivatedAt: new Date(),
        deactivatedByUserId: actor.userId,
      },
      where: {
        id: serviceId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.services.deactivated",
      entity: "service_catalog_entry",
      recordId: serviceId,
    });
  });
}

export async function listProductCategories(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: StockFilters,
): Promise<ProductCategory[]> {
  return prisma.productCategory.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    where: {
      deactivatedAt: null,
      tenantId,
      ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    },
  });
}

export async function readProductCategory(
  prisma: PrismaDatabase,
  tenantId: string,
  categoryId: string,
): Promise<ProductCategory> {
  const category = await prisma.productCategory.findFirst({
    where: {
      deactivatedAt: null,
      id: categoryId,
      tenantId,
    },
  });

  if (!category) {
    throw notFound();
  }

  return category;
}

export async function createProductCategory(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateProductCategoryInput,
): Promise<ProductCategory> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.productCategory.create({
      data: {
        description: input.description,
        name: input.name,
        tenantId: actor.tenantId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.categories.created",
      entity: "product_category",
      fields: compactFields(input),
      recordId: created.id,
    });

    return created;
  });
}

export async function updateProductCategory(
  prisma: PrismaDatabase,
  actor: ActorContext,
  categoryId: string,
  input: UpdateProductCategoryInput,
): Promise<ProductCategory> {
  await readProductCategory(prisma, actor.tenantId, categoryId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.productCategory.update({
      data: {
        ...(Object.hasOwn(input, "description") ? { description: input.description } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
      },
      where: {
        id: categoryId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.categories.updated",
      entity: "product_category",
      fields: compactFields(input),
      recordId: updated.id,
    });

    return updated;
  });
}

export async function deactivateProductCategory(
  prisma: PrismaDatabase,
  actor: ActorContext,
  categoryId: string,
): Promise<void> {
  await readProductCategory(prisma, actor.tenantId, categoryId);

  const activeProducts = await prisma.product.count({
    where: {
      categoryId,
      deactivatedAt: null,
      tenantId: actor.tenantId,
    },
  });

  if (activeProducts > 0) {
    throw new HttpError(409, "Category has active products.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.productCategory.update({
      data: {
        deactivatedAt: new Date(),
        deactivatedByUserId: actor.userId,
      },
      where: {
        id: categoryId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.categories.deactivated",
      entity: "product_category",
      recordId: categoryId,
    });
  });
}

export async function listProducts(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: StockFilters,
): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    include: productInclude,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    where: {
      deactivatedAt: null,
      tenantId,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { sku: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  });
}

export async function readProduct(
  prisma: PrismaDatabase,
  tenantId: string,
  productId: string,
): Promise<ProductWithRelations> {
  const product = await prisma.product.findFirst({
    include: productInclude,
    where: {
      deactivatedAt: null,
      id: productId,
      tenantId,
    },
  });

  if (!product) {
    throw notFound();
  }

  return product;
}

export async function createProduct(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateProductInput,
): Promise<ProductWithRelations> {
  await readProductCategory(prisma, actor.tenantId, input.categoryId);

  return prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        categoryId: input.categoryId,
        costPrice: input.costPrice ? new Prisma.Decimal(input.costPrice) : null,
        description: input.description,
        minimumStock: input.minimumStock,
        name: input.name,
        salePrice: input.salePrice ? new Prisma.Decimal(input.salePrice) : null,
        sku: input.sku,
        stock: {
          create: {
            tenantId: actor.tenantId,
          },
        },
        tenantId: actor.tenantId,
      },
      include: productInclude,
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.products.created",
      entity: "product",
      fields: compactFields(input),
      recordId: created.id,
    });

    return created;
  });
}

export async function updateProduct(
  prisma: PrismaDatabase,
  actor: ActorContext,
  productId: string,
  input: UpdateProductInput,
): Promise<ProductWithRelations> {
  await readProduct(prisma, actor.tenantId, productId);

  if (input.categoryId !== undefined) {
    await readProductCategory(prisma, actor.tenantId, input.categoryId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      data: {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(Object.hasOwn(input, "costPrice")
          ? { costPrice: input.costPrice ? new Prisma.Decimal(input.costPrice) : null }
          : {}),
        ...(Object.hasOwn(input, "description") ? { description: input.description } : {}),
        ...(input.minimumStock !== undefined ? { minimumStock: input.minimumStock } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(Object.hasOwn(input, "salePrice")
          ? { salePrice: input.salePrice ? new Prisma.Decimal(input.salePrice) : null }
          : {}),
        ...(Object.hasOwn(input, "sku") ? { sku: input.sku } : {}),
      },
      include: productInclude,
      where: {
        id: productId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.products.updated",
      entity: "product",
      fields: compactFields(input),
      recordId: updated.id,
    });

    return updated;
  });
}

export async function deactivateProduct(
  prisma: PrismaDatabase,
  actor: ActorContext,
  productId: string,
): Promise<void> {
  await readProduct(prisma, actor.tenantId, productId);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      data: {
        deactivatedAt: new Date(),
        deactivatedByUserId: actor.userId,
      },
      where: {
        id: productId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.products.deactivated",
      entity: "product",
      recordId: productId,
    });
  });
}

export async function listSuppliers(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: StockFilters,
): Promise<Supplier[]> {
  return prisma.supplier.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    where: {
      deactivatedAt: null,
      tenantId,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { documentNormalized: { contains: filters.search.replace(/\D/g, "") } },
            ],
          }
        : {}),
    },
  });
}

export async function readSupplier(
  prisma: PrismaDatabase,
  tenantId: string,
  supplierId: string,
): Promise<Supplier> {
  const supplier = await prisma.supplier.findFirst({
    where: {
      deactivatedAt: null,
      id: supplierId,
      tenantId,
    },
  });

  if (!supplier) {
    throw notFound();
  }

  return supplier;
}

export async function createSupplier(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateSupplierInput,
): Promise<Supplier> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.supplier.create({
      data: {
        document: input.document,
        documentNormalized: input.documentNormalized,
        name: input.name,
        notes: input.notes,
        phone: input.phone,
        phoneNormalized: input.phoneNormalized,
        tenantId: actor.tenantId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.suppliers.created",
      entity: "supplier",
      fields: compactFields(input),
      recordId: created.id,
    });

    return created;
  });
}

export async function updateSupplier(
  prisma: PrismaDatabase,
  actor: ActorContext,
  supplierId: string,
  input: UpdateSupplierInput,
): Promise<Supplier> {
  await readSupplier(prisma, actor.tenantId, supplierId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.supplier.update({
      data: {
        ...(Object.hasOwn(input, "document")
          ? {
              document: input.document,
              documentNormalized: input.documentNormalized,
            }
          : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(Object.hasOwn(input, "notes") ? { notes: input.notes } : {}),
        ...(Object.hasOwn(input, "phone")
          ? {
              phone: input.phone,
              phoneNormalized: input.phoneNormalized,
            }
          : {}),
      },
      where: {
        id: supplierId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.suppliers.updated",
      entity: "supplier",
      fields: compactFields(input),
      recordId: updated.id,
    });

    return updated;
  });
}

export async function deactivateSupplier(
  prisma: PrismaDatabase,
  actor: ActorContext,
  supplierId: string,
): Promise<void> {
  await readSupplier(prisma, actor.tenantId, supplierId);

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      data: {
        deactivatedAt: new Date(),
        deactivatedByUserId: actor.userId,
      },
      where: {
        id: supplierId,
      },
    });

    await writeStockAudit(tx as PrismaDatabase, actor, {
      action: "stock.suppliers.deactivated",
      entity: "supplier",
      recordId: supplierId,
    });
  });
}

export function serializeServiceCatalogEntry(service: ServiceCatalogEntry) {
  return {
    basePrice: service.basePrice.toFixed(2),
    createdAt: service.createdAt.toISOString(),
    deactivatedAt: service.deactivatedAt?.toISOString() ?? null,
    description: service.description,
    id: service.id,
    name: service.name,
    tenantId: service.tenantId,
    updatedAt: service.updatedAt.toISOString(),
  };
}

export function serializeProductCategory(category: ProductCategory) {
  return {
    createdAt: category.createdAt.toISOString(),
    deactivatedAt: category.deactivatedAt?.toISOString() ?? null,
    description: category.description,
    id: category.id,
    name: category.name,
    tenantId: category.tenantId,
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function serializeProduct(product: ProductWithRelations) {
  const physicalQuantity = product.stock?.physicalQuantity ?? 0;
  const reservedQuantity = product.stock?.reservedQuantity ?? 0;
  const availableQuantity = physicalQuantity - reservedQuantity;

  return {
    availableQuantity,
    category: product.category ?? null,
    categoryId: product.categoryId,
    costPrice: product.costPrice?.toFixed(2) ?? null,
    createdAt: product.createdAt.toISOString(),
    deactivatedAt: product.deactivatedAt?.toISOString() ?? null,
    description: product.description,
    id: product.id,
    lowStock: product.minimumStock > 0 && availableQuantity < product.minimumStock,
    minimumStock: product.minimumStock,
    name: product.name,
    physicalQuantity,
    reservedQuantity,
    salePrice: product.salePrice?.toFixed(2) ?? null,
    sku: product.sku,
    tenantId: product.tenantId,
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function serializeSupplier(supplier: Supplier) {
  return {
    createdAt: supplier.createdAt.toISOString(),
    deactivatedAt: supplier.deactivatedAt?.toISOString() ?? null,
    document: supplier.document,
    documentNormalized: supplier.documentNormalized,
    id: supplier.id,
    name: supplier.name,
    notes: supplier.notes,
    phone: supplier.phone,
    phoneNormalized: supplier.phoneNormalized,
    tenantId: supplier.tenantId,
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

const productInclude = {
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  stock: {
    select: {
      physicalQuantity: true,
      reservedQuantity: true,
    },
  },
} satisfies Prisma.ProductInclude;

function compactFields(input: Record<string, unknown>): string[] {
  return Object.keys(input)
    .filter(
      (key) =>
        ![
          "description",
          "document",
          "documentNormalized",
          "notes",
          "phone",
          "phoneNormalized",
        ].includes(key),
    )
    .sort();
}

async function writeStockAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: {
    action: string;
    entity: string;
    fields?: string[];
    recordId: string;
  },
): Promise<void> {
  await writeAuditLog(prisma, {
    action: input.action,
    entity: input.entity,
    ipAddress: actor.ipAddress,
    ...(input.fields ? { metadata: { fields: input.fields } } : {}),
    recordId: input.recordId,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}
