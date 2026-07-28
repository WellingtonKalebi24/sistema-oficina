import { Prisma } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";
import { notFound, requireTenantCustomerVehicleLink } from "../tenancy/tenantScope.js";
import { calculateQuoteTotals } from "./quoteCalculator.js";
import type {
  CreateQuoteInput,
  QuoteItemInput,
  QuoteListInput,
  UpdateQuoteDraftInput,
} from "./quoteSchemas.js";
import { QUOTE_STATUS } from "./quoteSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: typeof quoteIncludes;
}>;

type PreparedQuoteItem = Omit<
  QuoteItemInput,
  "description" | "productId" | "serviceCatalogEntryId" | "unitPrice"
> & {
  description: string;
  productId: string | null;
  serviceCatalogEntryId: string | null;
  unitPrice: string;
};

export async function listQuotes(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: QuoteListInput,
): Promise<QuoteWithRelations[]> {
  return prisma.quote.findMany({
    include: quoteIncludes,
    orderBy: { updatedAt: "desc" },
    where: {
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      tenantId,
    },
  });
}

export async function getQuote(
  prisma: PrismaDatabase,
  tenantId: string,
  quoteId: string,
): Promise<QuoteWithRelations> {
  const quote = await prisma.quote.findFirst({
    include: quoteIncludes,
    where: {
      id: quoteId,
      tenantId,
    },
  });

  if (!quote) {
    throw notFound();
  }

  return quote;
}

export async function createQuote(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateQuoteInput,
): Promise<QuoteWithRelations> {
  await validateQuoteAnchors(prisma, actor.tenantId, input);
  const preparedItems = await prepareItems(prisma, actor.tenantId, input.items ?? []);
  const warningPercent = await readDiscountWarningPercent(prisma, actor.tenantId);
  const totals = calculateQuoteTotals({
    discountWarningPercent: warningPercent,
    items: preparedItems,
    quoteDiscountAmount: input.quoteDiscountAmount,
    quoteSurchargeAmount: input.quoteSurchargeAmount,
  });

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        checkInId: input.checkInId ?? null,
        createdByUserId: actor.userId,
        customerId: input.customerId,
        customerNotes: input.customerNotes,
        diagnosisCausa: input.diagnosis.causa,
        diagnosisProblema: input.diagnosis.problema,
        diagnosisRecomendacao: input.diagnosis.recomendacao,
        discountAmount: new Prisma.Decimal(totals.discountAmount),
        discountWarningMessage: totals.discountWarning.message,
        discountWarningPercent: new Prisma.Decimal(totals.discountWarning.percent),
        discountWarningTriggered: totals.discountWarning.triggered,
        estimatedDeliveryAt: input.estimatedDeliveryAt,
        internalNotes: input.internalNotes,
        items: {
          create: preparedItems.map((item, index) => toItemCreate(actor.tenantId, item, totals.items[index]!, index)),
        },
        sourceKind: input.checkInId ? "check-in" : "direct",
        status: QUOTE_STATUS.draft,
        subtotalAmount: new Prisma.Decimal(totals.subtotalAmount),
        surchargeAmount: new Prisma.Decimal(totals.surchargeAmount),
        tenantId: actor.tenantId,
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        validUntil: input.validUntil,
        vehicleId: input.vehicleId,
      },
      include: quoteIncludes,
    });

    await writeQuoteAudit(tx as PrismaDatabase, actor, {
      action: "quotes.created",
      fields: ["customerId", "vehicleId", ...(input.checkInId ? ["checkInId"] : [])],
      quote,
    });
    if (hasDiagnosis(input.diagnosis)) {
      await writeQuoteAudit(tx as PrismaDatabase, actor, {
        action: "quotes.diagnosis.updated",
        fields: changedDiagnosisFields(input.diagnosis),
        quote,
      });
    }
    if (totals.discountWarning.triggered) {
      await writeDiscountWarningAudit(tx as PrismaDatabase, actor, quote);
    }

    return quote;
  });
}

export async function updateQuoteDraft(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quoteId: string,
  input: UpdateQuoteDraftInput,
): Promise<QuoteWithRelations> {
  const current = await getQuote(prisma, actor.tenantId, quoteId);

  if (current.status !== QUOTE_STATUS.draft) {
    throw new HttpError(409, "Only draft quotes can be edited.");
  }

  const preparedItems =
    input.items === undefined
      ? current.items.map(itemFromCurrent)
      : await prepareItems(prisma, actor.tenantId, input.items);
  const warningPercent = await readDiscountWarningPercent(prisma, actor.tenantId);
  const totals = calculateQuoteTotals({
    discountWarningPercent: warningPercent,
    items: preparedItems,
    quoteDiscountAmount: input.quoteDiscountAmount ?? "0.00",
    quoteSurchargeAmount: input.quoteSurchargeAmount ?? "0.00",
  });
  const diagnosis = input.diagnosis ?? {
    causa: current.diagnosisCausa,
    problema: current.diagnosisProblema,
    recomendacao: current.diagnosisRecomendacao,
  };

  return prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.quoteItem.deleteMany({
        where: {
          quoteId: current.id,
          tenantId: actor.tenantId,
        },
      });
    }

    const data: Prisma.QuoteUncheckedUpdateInput = {
      discountAmount: new Prisma.Decimal(totals.discountAmount),
      discountWarningMessage: totals.discountWarning.message,
      discountWarningPercent: new Prisma.Decimal(totals.discountWarning.percent),
      discountWarningTriggered: totals.discountWarning.triggered,
      subtotalAmount: new Prisma.Decimal(totals.subtotalAmount),
      surchargeAmount: new Prisma.Decimal(totals.surchargeAmount),
      totalAmount: new Prisma.Decimal(totals.totalAmount),
      updatedByUserId: actor.userId,
    };

    if (Object.hasOwn(input, "customerNotes")) {
      data.customerNotes = input.customerNotes;
    }
    if (Object.hasOwn(input, "estimatedDeliveryAt")) {
      data.estimatedDeliveryAt = input.estimatedDeliveryAt;
    }
    if (Object.hasOwn(input, "internalNotes")) {
      data.internalNotes = input.internalNotes;
    }
    if (input.diagnosis) {
      data.diagnosisCausa = diagnosis.causa;
      data.diagnosisProblema = diagnosis.problema;
      data.diagnosisRecomendacao = diagnosis.recomendacao;
    }
    if (Object.hasOwn(input, "validUntil")) {
      data.validUntil = input.validUntil;
    }
    if (input.items !== undefined) {
      data.items = {
        create: preparedItems.map((item, index) =>
          toItemCreate(actor.tenantId, item, totals.items[index]!, index),
        ),
      };
    }

    await tx.quote.update({
      data,
      where: {
        id: current.id,
      },
    });
    const updated = await tx.quote.findFirstOrThrow({
      include: quoteIncludes,
      where: {
        id: current.id,
        tenantId: actor.tenantId,
      },
    });

    if (input.diagnosis) {
      await writeQuoteAudit(tx as PrismaDatabase, actor, {
        action: "quotes.diagnosis.updated",
        fields: changedDiagnosisFields(input.diagnosis),
        quote: updated,
      });
    }
    await writeQuoteAudit(tx as PrismaDatabase, actor, {
      action: "quotes.draft.updated",
      fields: compactDraftFields(input),
      quote: updated,
    });
    if (totals.discountWarning.triggered) {
      await writeDiscountWarningAudit(tx as PrismaDatabase, actor, updated);
    }

    return updated;
  });
}

export function serializeQuote(quote: QuoteWithRelations) {
  const missing = publishMissingFields(quote);

  return {
    checkInId: quote.checkInId,
    createdAt: quote.createdAt.toISOString(),
    createdByUserId: quote.createdByUserId,
    customer: quote.customer,
    customerId: quote.customerId,
    customerNotes: quote.customerNotes,
    diagnosis: {
      causa: quote.diagnosisCausa,
      problema: quote.diagnosisProblema,
      recomendacao: quote.diagnosisRecomendacao,
    },
    discountWarning: {
      message: quote.discountWarningMessage,
      percent: quote.discountWarningPercent.toFixed(2),
      triggered: quote.discountWarningTriggered,
    },
    estimatedDeliveryAt: quote.estimatedDeliveryAt?.toISOString() ?? null,
    id: quote.id,
    internalNotes: quote.internalNotes,
    items: quote.items.map((item) => ({
      description: item.description,
      discountAmount: item.discountAmount.toFixed(2),
      id: item.id,
      kind: item.kind,
      productId: item.productId,
      quantity: item.quantity.toFixed(3),
      serviceCatalogEntryId: item.serviceCatalogEntryId,
      sortOrder: item.sortOrder,
      surchargeAmount: item.surchargeAmount.toFixed(2),
      totalAmount: item.totalAmount.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
    })),
    publishReadiness: {
      canPublish: missing.length === 0,
      missing,
    },
    sourceKind: quote.sourceKind === "check-in" ? "check_in" : quote.sourceKind,
    status: quote.status,
    tenantId: quote.tenantId,
    totals: {
      discountAmount: quote.discountAmount.toFixed(2),
      subtotalAmount: quote.subtotalAmount.toFixed(2),
      surchargeAmount: quote.surchargeAmount.toFixed(2),
      totalAmount: quote.totalAmount.toFixed(2),
    },
    updatedAt: quote.updatedAt.toISOString(),
    updatedByUserId: quote.updatedByUserId,
    validUntil: quote.validUntil?.toISOString() ?? null,
    vehicle: quote.vehicle,
    vehicleId: quote.vehicleId,
  };
}

const quoteIncludes = {
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  items: {
    orderBy: {
      sortOrder: "asc",
    },
  },
  vehicle: {
    select: {
      id: true,
      plateNormalized: true,
    },
  },
} satisfies Prisma.QuoteInclude;

async function validateQuoteAnchors(
  prisma: PrismaDatabase,
  tenantId: string,
  input: { checkInId?: string | undefined; customerId: string; vehicleId: string },
): Promise<void> {
  await requireTenantCustomerVehicleLink(prisma, tenantId, input);

  if (!input.checkInId) {
    return;
  }

  const checkIn = await prisma.receptionCheckIn.findFirst({
    select: {
      customerId: true,
      id: true,
      vehicleId: true,
    },
    where: {
      id: input.checkInId,
      tenantId,
    },
  });

  if (!checkIn) {
    throw notFound();
  }

  if (checkIn.customerId !== input.customerId || checkIn.vehicleId !== input.vehicleId) {
    throw badRequest("Quote customer and vehicle must match the check-in.");
  }
}

async function prepareItems(
  prisma: PrismaDatabase,
  tenantId: string,
  items: QuoteItemInput[],
): Promise<PreparedQuoteItem[]> {
  const prepared: PreparedQuoteItem[] = [];

  for (const item of items) {
    if (item.kind === "service") {
      const serviceId = item.serviceCatalogEntryId;
      if (!serviceId) {
        throw badRequest("Service item requires serviceCatalogEntryId.");
      }
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

      prepared.push({
        discountAmount: item.discountAmount,
        kind: item.kind,
        quantity: item.quantity,
        surchargeAmount: item.surchargeAmount,
        description: item.description ?? service.name,
        productId: null,
        serviceCatalogEntryId: service.id,
        unitPrice: item.unitPrice ?? service.basePrice.toFixed(2),
      });
      continue;
    }

    const productId = item.productId;
    if (!productId) {
      throw badRequest("Product item requires productId.");
    }

    const product = await prisma.product.findFirst({
      where: {
        deactivatedAt: null,
        id: productId,
        tenantId,
      },
    });

    if (!product) {
      throw notFound();
    }

    if (!product.salePrice && !item.unitPrice) {
      throw badRequest("Product quote item requires sale price.");
    }

    prepared.push({
      discountAmount: item.discountAmount,
      kind: item.kind,
      quantity: item.quantity,
      surchargeAmount: item.surchargeAmount,
      description: item.description ?? product.name,
      productId: product.id,
      serviceCatalogEntryId: null,
      unitPrice: item.unitPrice ?? product.salePrice!.toFixed(2),
    });
  }

  return prepared;
}

function toItemCreate(
  tenantId: string,
  item: PreparedQuoteItem,
  totals: { discountAmount: string; surchargeAmount: string; totalAmount: string; unitPrice: string },
  index: number,
) {
  return {
    description: item.description,
    discountAmount: new Prisma.Decimal(totals.discountAmount),
    kind: item.kind,
    productId: item.productId,
    quantity: new Prisma.Decimal(item.quantity),
    serviceCatalogEntryId: item.serviceCatalogEntryId,
    sortOrder: index,
    surchargeAmount: new Prisma.Decimal(totals.surchargeAmount),
    tenantId,
    totalAmount: new Prisma.Decimal(totals.totalAmount),
    unitPrice: new Prisma.Decimal(totals.unitPrice),
  };
}

function itemFromCurrent(item: QuoteWithRelations["items"][number]): PreparedQuoteItem {
  return {
    description: item.description,
    discountAmount: item.discountAmount.toFixed(2),
    kind: item.kind as "service" | "product",
    productId: item.productId,
    quantity: item.quantity.toFixed(3),
    serviceCatalogEntryId: item.serviceCatalogEntryId,
    surchargeAmount: item.surchargeAmount.toFixed(2),
    unitPrice: item.unitPrice.toFixed(2),
  };
}

async function readDiscountWarningPercent(
  prisma: PrismaDatabase,
  tenantId: string,
): Promise<string> {
  const settings = await prisma.companySetting.findUnique({
    select: {
      quoteDiscountWarningPercent: true,
    },
    where: {
      tenantId,
    },
  });

  return settings?.quoteDiscountWarningPercent.toFixed(2) ?? "10.00";
}

function publishMissingFields(quote: QuoteWithRelations): string[] {
  const missing: string[] = [];

  if (!quote.validUntil) {
    missing.push("validUntil");
  }

  if (quote.sourceKind === "check-in") {
    if (!quote.diagnosisProblema) {
      missing.push("diagnosis.problema");
    }
    if (!quote.diagnosisCausa) {
      missing.push("diagnosis.causa");
    }
    if (!quote.diagnosisRecomendacao) {
      missing.push("diagnosis.recomendacao");
    }
  }

  return missing;
}

function hasDiagnosis(input: { causa: string | null; problema: string | null; recomendacao: string | null }): boolean {
  return Boolean(input.causa || input.problema || input.recomendacao);
}

function changedDiagnosisFields(input: {
  causa: string | null;
  problema: string | null;
  recomendacao: string | null;
}): string[] {
  return Object.entries(input)
    .filter(([, value]) => value !== null)
    .map(([key]) => `diagnosis.${key}`)
    .sort();
}

function compactDraftFields(input: UpdateQuoteDraftInput): string[] {
  return Object.keys(input)
    .filter((field) => !["customerNotes", "internalNotes"].includes(field))
    .sort();
}

async function writeQuoteAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: {
    action: string;
    fields: string[];
    quote: QuoteWithRelations;
  },
): Promise<void> {
  await writeAuditLog(prisma, {
    action: input.action,
    entity: "quote",
    ipAddress: actor.ipAddress,
    metadata: {
      checkInId: input.quote.checkInId,
      customerId: input.quote.customerId,
      fields: input.fields,
      status: input.quote.status,
      vehicleId: input.quote.vehicleId,
    },
    recordId: input.quote.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}

async function writeDiscountWarningAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quote: QuoteWithRelations,
): Promise<void> {
  await writeAuditLog(prisma, {
    action: "quotes.discount.warning",
    entity: "quote",
    ipAddress: actor.ipAddress,
    metadata: {
      discountWarningPercent: quote.discountWarningPercent.toFixed(2),
      discountWarningTriggered: quote.discountWarningTriggered,
      totalDiscountAmount: quote.discountAmount.toFixed(2),
      totalAmount: quote.totalAmount.toFixed(2),
    },
    recordId: quote.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}
