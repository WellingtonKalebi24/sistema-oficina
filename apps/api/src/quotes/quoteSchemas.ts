import { z } from "zod";

export const QUOTE_STATUS = {
  draft: "Rascunho",
  sent: "Enviado",
  published: "Publicado",
  expired: "Expirado",
  cancelled: "Cancelado",
} as const;

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

const quantityString = z.union([z.string().trim(), z.number().finite()]).transform((value) => {
  const text = typeof value === "number" ? value.toString() : value;

  if (!/^\d+(\.\d{1,3})?$/.test(text) || Number(text) <= 0) {
    throw new Error("Invalid quantity.");
  }

  return Number(text).toFixed(3);
});

const optionalDecimalString = z
  .union([z.string().trim(), z.number().finite()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return "0.00";
    }

    const text = typeof value === "number" ? value.toString() : value;

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      throw new Error("Invalid decimal amount.");
    }

    return Number(text).toFixed(2);
  });

const optionalDate = z
  .string()
  .trim()
  .datetime({ offset: true })
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : null));

const diagnosisSchema = z
  .object({
    causa: optionalText,
    problema: optionalText,
    recomendacao: optionalText,
  })
  .optional()
  .nullable()
  .transform(
    (value) =>
      value ?? {
        causa: null,
        problema: null,
        recomendacao: null,
      },
  );

const quoteItemSchema = z
  .object({
    description: optionalShortText(240),
    discountAmount: optionalDecimalString,
    kind: z.enum(["service", "product"]),
    productId: z.string().trim().min(1).optional(),
    quantity: quantityString,
    serviceCatalogEntryId: z.string().trim().min(1).optional(),
    surchargeAmount: optionalDecimalString,
    unitPrice: decimalString.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "service" && !value.serviceCatalogEntryId) {
      ctx.addIssue({
        code: "custom",
        message: "Service item requires serviceCatalogEntryId.",
        path: ["serviceCatalogEntryId"],
      });
    }

    if (value.kind === "product" && !value.productId) {
      ctx.addIssue({
        code: "custom",
        message: "Product item requires productId.",
        path: ["productId"],
      });
    }
  });

export const quoteListSchema = z.object({
  customerId: z.string().trim().min(1).optional(),
  status: z.enum(Object.values(QUOTE_STATUS) as [string, ...string[]]).optional(),
  vehicleId: z.string().trim().min(1).optional(),
});

export const createQuoteSchema = z.object({
  checkInId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1),
  customerNotes: optionalText,
  diagnosis: diagnosisSchema,
  estimatedDeliveryAt: optionalDate,
  internalNotes: optionalText,
  items: z.array(quoteItemSchema).optional(),
  quoteDiscountAmount: optionalDecimalString,
  quoteSurchargeAmount: optionalDecimalString,
  validUntil: optionalDate,
  vehicleId: z.string().trim().min(1),
});

export const updateQuoteDraftSchema = z.object({
  customerNotes: optionalText,
  diagnosis: diagnosisSchema.optional(),
  estimatedDeliveryAt: optionalDate,
  internalNotes: optionalText,
  items: z.array(quoteItemSchema).optional(),
  quoteDiscountAmount: optionalDecimalString.optional(),
  quoteSurchargeAmount: optionalDecimalString.optional(),
  validUntil: optionalDate,
});

export const quoteApprovalLinkSchema = z.object({
  expiresAt: optionalDate,
});

export type QuoteListInput = z.infer<typeof quoteListSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteApprovalLinkInput = z.infer<typeof quoteApprovalLinkSchema>;
export type UpdateQuoteDraftInput = z.infer<typeof updateQuoteDraftSchema>;
