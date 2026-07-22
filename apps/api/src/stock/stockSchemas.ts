import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const optionalShortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const decimalString = z.union([z.string().trim(), z.number().finite()]).transform((value) => {
  const text = typeof value === "number" ? value.toString() : value;

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("Invalid decimal amount.");
  }

  return Number(text).toFixed(2);
});

const optionalDecimalString = z
  .union([z.string().trim(), z.number().finite()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const text = typeof value === "number" ? value.toString() : value;

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      throw new Error("Invalid decimal amount.");
    }

    return Number(text).toFixed(2);
  });

const integerQuantity = z
  .number()
  .int()
  .min(0)
  .optional()
  .nullable()
  .transform((value) => value ?? 0);

const positiveIntegerQuantity = z.number().int().positive();

const nonZeroIntegerQuantity = z
  .number()
  .int()
  .refine((value) => value !== 0);

const sourceKind = z.string().trim().min(1).max(80);

export function normalizeSupplierDocument(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || null;
}

export function normalizeSupplierPhone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\D/g, "");
  return normalized || null;
}

export const stockFilterSchema = z.object({
  productId: z.string().trim().min(1).optional(),
  search: z.string().trim().max(120).optional(),
  sourceKind: z.string().trim().max(80).optional(),
  status: z.enum(["active", "cancelled"]).optional(),
  type: z.string().trim().max(40).optional(),
});

export const createServiceCatalogEntrySchema = z.object({
  basePrice: decimalString,
  description: optionalText,
  name: z.string().trim().min(1).max(160),
});

export const updateServiceCatalogEntrySchema = z.object({
  basePrice: decimalString.optional(),
  description: optionalText,
  name: z.string().trim().min(1).max(160).optional(),
});

export const createProductCategorySchema = z.object({
  description: optionalText,
  name: z.string().trim().min(1).max(120),
});

export const updateProductCategorySchema = z.object({
  description: optionalText,
  name: z.string().trim().min(1).max(120).optional(),
});

export const createProductSchema = z.object({
  categoryId: z.string().trim().min(1),
  costPrice: optionalDecimalString,
  description: optionalText,
  minimumStock: integerQuantity,
  name: z.string().trim().min(1).max(160),
  salePrice: optionalDecimalString,
  sku: optionalShortText(80),
});

export const updateProductSchema = z.object({
  categoryId: z.string().trim().min(1).optional(),
  costPrice: optionalDecimalString,
  description: optionalText,
  minimumStock: integerQuantity.optional(),
  name: z.string().trim().min(1).max(160).optional(),
  salePrice: optionalDecimalString,
  sku: optionalShortText(80),
});

export const createSupplierSchema = z
  .object({
    document: optionalShortText(40),
    name: z.string().trim().min(1).max(160),
    notes: optionalText,
    phone: optionalShortText(32),
  })
  .transform((value) => ({
    ...value,
    documentNormalized: normalizeSupplierDocument(value.document),
    phoneNormalized: normalizeSupplierPhone(value.phone),
  }));

export const updateSupplierSchema = z
  .object({
    document: optionalShortText(40),
    name: z.string().trim().min(1).max(160).optional(),
    notes: optionalText,
    phone: optionalShortText(32),
  })
  .transform((value) => {
    const normalized: typeof value & {
      documentNormalized?: string | null;
      phoneNormalized?: string | null;
    } = { ...value };

    if (Object.hasOwn(value, "document")) {
      normalized.documentNormalized = normalizeSupplierDocument(value.document);
    }

    if (Object.hasOwn(value, "phone")) {
      normalized.phoneNormalized = normalizeSupplierPhone(value.phone);
    }

    return normalized;
  });

export const createPurchaseSchema = z.object({
  documentNumber: optionalShortText(80),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: positiveIntegerQuantity,
        unitCost: decimalString,
      }),
    )
    .min(1),
  purchasedAt: z
    .string()
    .trim()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  supplierId: z.string().trim().min(1),
});

export const createStockExitSchema = z.object({
  origin: z.string().trim().min(1).max(240),
  productId: z.string().trim().min(1),
  quantity: positiveIntegerQuantity,
  sourceKind,
  sourceLabel: optionalShortText(240),
});

export const createStockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1),
  quantityDelta: nonZeroIntegerQuantity,
  reason: z.string().trim().min(1).max(500),
  sourceKind,
  sourceLabel: optionalShortText(240),
});

export const createStockReservationSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: positiveIntegerQuantity,
  sourceId: optionalShortText(120),
  sourceKind,
  sourceLabel: optionalShortText(240),
  sourceReference: optionalShortText(240),
});

export type StockFilters = z.infer<typeof stockFilterSchema>;
export type CreateServiceCatalogEntryInput = z.infer<typeof createServiceCatalogEntrySchema>;
export type UpdateServiceCatalogEntryInput = z.infer<typeof updateServiceCatalogEntrySchema>;
export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreateStockExitInput = z.infer<typeof createStockExitSchema>;
export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
export type CreateStockReservationInput = z.infer<typeof createStockReservationSchema>;
