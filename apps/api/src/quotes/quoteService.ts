import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";
import { notFound, requireTenantCustomerVehicleLink } from "../tenancy/tenantScope.js";
import { calculateQuoteTotals } from "./quoteCalculator.js";
import type {
  CreateQuoteInput,
  QuoteApprovalLinkInput,
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

export type QuoteVersionWithRelations = Prisma.QuoteVersionGetPayload<{
  include: typeof quoteVersionIncludes;
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

export async function publishQuoteVersion(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quoteId: string,
): Promise<QuoteVersionWithRelations> {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      include: publishQuoteIncludes,
      where: {
        id: quoteId,
        tenantId: actor.tenantId,
      },
    });

    if (!quote) {
      throw notFound();
    }

    if (quote.status !== QUOTE_STATUS.draft) {
      throw new HttpError(409, "Only draft quotes can be published.");
    }

    const missing = publishMissingFields(quote);
    if (missing.length > 0) {
      throw badRequest(`Quote is missing required publication fields: ${missing.join(", ")}.`);
    }

    const preparedItems = quote.items.map(itemFromCurrent);
    const itemTotals = calculateQuoteTotals({
      discountWarningPercent: quote.discountWarningPercent.toFixed(2),
      items: preparedItems,
      quoteDiscountAmount: "0.00",
      quoteSurchargeAmount: "0.00",
    });
    const latest = await tx.quoteVersion.aggregate({
      _max: {
        versionNumber: true,
      },
      where: {
        quoteId: quote.id,
        tenantId: actor.tenantId,
      },
    });
    const versionNumber = (latest._max.versionNumber ?? 0) + 1;
    const settings = await tx.companySetting.findUnique({
      where: {
        tenantId: actor.tenantId,
      },
    });
    const vehicleLabel = [quote.vehicle.brand, quote.vehicle.model].filter(Boolean).join(" ").trim();

    const version = await tx.quoteVersion.create({
      data: {
        checkInId: quote.checkInId,
        customerDocument: quote.customer.document,
        customerEmail: quote.customer.email,
        customerId: quote.customerId,
        customerName: quote.customer.name,
        customerNotes: quote.customerNotes,
        customerPhone: quote.customer.phone,
        diagnosisCausa: quote.diagnosisCausa,
        diagnosisProblema: quote.diagnosisProblema,
        diagnosisRecomendacao: quote.diagnosisRecomendacao,
        discountAmount: quote.discountAmount,
        discountWarningMessage: quote.discountWarningMessage,
        discountWarningPercent: quote.discountWarningPercent,
        discountWarningTriggered: quote.discountWarningTriggered,
        estimatedDeliveryAt: quote.estimatedDeliveryAt,
        items: {
          create: preparedItems.map((item, index) =>
            toVersionItemCreate(actor.tenantId, item, itemTotals.items[index]!, index),
          ),
        },
        publishedByUserId: actor.userId,
        quoteId: quote.id,
        sourceKind: quote.sourceKind,
        status: QUOTE_STATUS.published,
        subtotalAmount: quote.subtotalAmount,
        surchargeAmount: quote.surchargeAmount,
        tenantId: actor.tenantId,
        totalAmount: quote.totalAmount,
        validUntil: quote.validUntil!,
        vehicleBrand: quote.vehicle.brand,
        vehicleId: quote.vehicleId,
        vehicleLabel: vehicleLabel || quote.vehicle.plateNormalized || quote.vehicle.id,
        vehicleModel: quote.vehicle.model,
        vehiclePlate: quote.vehicle.plateNormalized,
        vehicleYear: quote.vehicle.year,
        versionNumber,
        workshopDocument: settings?.document ?? null,
        workshopLegalName: settings?.legalName ?? null,
        workshopTradeName: settings?.tradeName ?? "Oficina",
      },
      include: quoteVersionIncludes,
    });

    await tx.quote.update({
      data: {
        currentVersionId: version.id,
        status: QUOTE_STATUS.published,
        updatedByUserId: actor.userId,
      },
      where: {
        id: quote.id,
      },
    });

    await writeVersionAudit(tx as PrismaDatabase, actor, version, "quotes.version.published");
    if (quote.discountWarningTriggered) {
      await writeAuditLog(tx as PrismaDatabase, {
        action: "quotes.discount.warning",
        entity: "quote_version",
        ipAddress: actor.ipAddress,
        metadata: {
          discountWarningPercent: version.discountWarningPercent.toFixed(2),
          discountWarningTriggered: version.discountWarningTriggered,
          totalAmount: version.totalAmount.toFixed(2),
          totalDiscountAmount: version.discountAmount.toFixed(2),
          versionNumber: version.versionNumber,
        },
        recordId: version.id,
        tenantId: actor.tenantId,
        userAgent: actor.userAgent,
        userId: actor.userId,
      });
    }

    return version;
  });
}

export async function createNewQuoteVersionDraft(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quoteId: string,
): Promise<QuoteWithRelations> {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      include: {
        currentVersion: {
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
      where: {
        id: quoteId,
        tenantId: actor.tenantId,
      },
    });

    if (!quote) {
      throw notFound();
    }

    if (!quote.currentVersion) {
      throw new HttpError(409, "Quote does not have a published version to copy.");
    }

    await tx.quoteItem.deleteMany({
      where: {
        quoteId: quote.id,
        tenantId: actor.tenantId,
      },
    });

    await tx.quote.update({
      data: {
        customerNotes: quote.currentVersion.customerNotes,
        diagnosisCausa: quote.currentVersion.diagnosisCausa,
        diagnosisProblema: quote.currentVersion.diagnosisProblema,
        diagnosisRecomendacao: quote.currentVersion.diagnosisRecomendacao,
        discountAmount: quote.currentVersion.discountAmount,
        discountWarningMessage: quote.currentVersion.discountWarningMessage,
        discountWarningPercent: quote.currentVersion.discountWarningPercent,
        discountWarningTriggered: quote.currentVersion.discountWarningTriggered,
        estimatedDeliveryAt: quote.currentVersion.estimatedDeliveryAt,
        items: {
          create: quote.currentVersion.items.map((item) => ({
            description: item.description,
            discountAmount: item.discountAmount,
            kind: item.kind,
            productId: item.productId,
            quantity: item.quantity,
            serviceCatalogEntryId: item.serviceCatalogEntryId,
            sortOrder: item.sortOrder,
            surchargeAmount: item.surchargeAmount,
            tenantId: actor.tenantId,
            totalAmount: item.totalAmount,
            unitPrice: item.unitPrice,
          })),
        },
        status: QUOTE_STATUS.draft,
        subtotalAmount: quote.currentVersion.subtotalAmount,
        surchargeAmount: quote.currentVersion.surchargeAmount,
        totalAmount: quote.currentVersion.totalAmount,
        updatedByUserId: actor.userId,
        validUntil: quote.currentVersion.validUntil,
      },
      where: {
        id: quote.id,
      },
    });

    const updated = await tx.quote.findFirstOrThrow({
      include: quoteIncludes,
      where: {
        id: quote.id,
        tenantId: actor.tenantId,
      },
    });

    await writeQuoteAudit(tx as PrismaDatabase, actor, {
      action: "quotes.version.draft.created",
      fields: ["currentVersionId"],
      quote: updated,
    });

    return updated;
  });
}

export async function getPublishedQuoteVersion(
  prisma: PrismaDatabase,
  tenantId: string,
  quoteId: string,
  versionId: string,
): Promise<QuoteVersionWithRelations> {
  const version = await prisma.quoteVersion.findFirst({
    include: quoteVersionIncludes,
    where: {
      id: versionId,
      quoteId,
      tenantId,
    },
  });

  if (!version) {
    throw notFound();
  }

  return version;
}

export async function createQuoteApprovalLink(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quoteId: string,
  versionId: string,
  input: QuoteApprovalLinkInput,
  baseUrl: string,
): Promise<{ approvalUrl: string; expiresAt: string | null; quoteVersionId: string }> {
  const version = await getPublishedQuoteVersion(prisma, actor.tenantId, quoteId, versionId);

  if (version.status !== QUOTE_STATUS.published && version.status !== QUOTE_STATUS.sent) {
    throw new HttpError(409, "Approval links are available only for published quote versions.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const link = await prisma.quoteApprovalLink.create({
    data: {
      createdByUserId: actor.userId,
      expiresAt: input.expiresAt,
      quoteVersionId: version.id,
      tenantId: actor.tenantId,
      tokenHash,
    },
  });

  await writeAuditLog(prisma, {
    action: "quotes.link.created",
    entity: "quote_approval_link",
    ipAddress: actor.ipAddress,
    metadata: {
      expiresAt: link.expiresAt,
      quoteId,
      quoteVersionId: version.id,
      versionNumber: version.versionNumber,
    },
    recordId: link.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });

  return {
    approvalUrl: `${baseUrl.replace(/\/$/, "")}/quote-approval/${token}`,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    quoteVersionId: version.id,
  };
}

export async function markQuoteSent(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quoteId: string,
): Promise<QuoteVersionWithRelations> {
  return updateManualQuoteStatus(prisma, actor, quoteId, QUOTE_STATUS.sent, "quotes.status.sent");
}

export async function cancelQuote(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quoteId: string,
): Promise<QuoteVersionWithRelations> {
  return updateManualQuoteStatus(
    prisma,
    actor,
    quoteId,
    QUOTE_STATUS.cancelled,
    "quotes.status.cancelled",
  );
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

export function serializeQuoteVersion(version: QuoteVersionWithRelations) {
  return {
    checkInId: version.checkInId,
    customer: {
      document: version.customerDocument,
      email: version.customerEmail,
      name: version.customerName,
      phone: version.customerPhone,
    },
    customerId: version.customerId,
    customerNotes: version.customerNotes,
    diagnosis: {
      causa: version.diagnosisCausa,
      problema: version.diagnosisProblema,
      recomendacao: version.diagnosisRecomendacao,
    },
    discountWarning: {
      message: version.discountWarningMessage,
      percent: version.discountWarningPercent.toFixed(2),
      triggered: version.discountWarningTriggered,
    },
    estimatedDeliveryAt: version.estimatedDeliveryAt?.toISOString() ?? null,
    id: version.id,
    items: version.items.map((item) => ({
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
    publishedAt: version.publishedAt.toISOString(),
    quoteId: version.quoteId,
    sourceKind: version.sourceKind === "check-in" ? "check_in" : version.sourceKind,
    status: version.status,
    tenantId: version.tenantId,
    totals: {
      discountAmount: version.discountAmount.toFixed(2),
      subtotalAmount: version.subtotalAmount.toFixed(2),
      surchargeAmount: version.surchargeAmount.toFixed(2),
      totalAmount: version.totalAmount.toFixed(2),
    },
    validUntil: version.validUntil.toISOString(),
    vehicle: {
      brand: version.vehicleBrand,
      label: version.vehicleLabel,
      model: version.vehicleModel,
      plate: version.vehiclePlate,
      year: version.vehicleYear,
    },
    vehicleId: version.vehicleId,
    versionNumber: version.versionNumber,
    workshop: {
      document: version.workshopDocument,
      legalName: version.workshopLegalName,
      tradeName: version.workshopTradeName,
    },
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

const quoteVersionIncludes = {
  items: {
    orderBy: {
      sortOrder: "asc",
    },
  },
} satisfies Prisma.QuoteVersionInclude;

const publishQuoteIncludes = {
  customer: {
    select: {
      document: true,
      email: true,
      id: true,
      name: true,
      phone: true,
    },
  },
  items: {
    orderBy: {
      sortOrder: "asc",
    },
  },
  vehicle: {
    select: {
      brand: true,
      id: true,
      model: true,
      plateNormalized: true,
      year: true,
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

function toVersionItemCreate(
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

async function updateManualQuoteStatus(
  prisma: PrismaDatabase,
  actor: ActorContext,
  quoteId: string,
  status: string,
  action: string,
): Promise<QuoteVersionWithRelations> {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      select: {
        currentVersionId: true,
        id: true,
      },
      where: {
        id: quoteId,
        tenantId: actor.tenantId,
      },
    });

    if (!quote?.currentVersionId) {
      throw new HttpError(409, "Quote does not have a published version.");
    }

    await tx.quote.update({
      data: {
        status,
        updatedByUserId: actor.userId,
      },
      where: {
        id: quote.id,
      },
    });
    const version = await tx.quoteVersion.update({
      data: {
        status,
        statusChangedAt: new Date(),
        statusChangedByUserId: actor.userId,
      },
      include: quoteVersionIncludes,
      where: {
        id: quote.currentVersionId,
      },
    });

    await writeVersionAudit(tx as PrismaDatabase, actor, version, action);

    return version;
  });
}

async function writeVersionAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  version: QuoteVersionWithRelations,
  action: string,
): Promise<void> {
  await writeAuditLog(prisma, {
    action,
    entity: "quote_version",
    ipAddress: actor.ipAddress,
    metadata: {
      quoteId: version.quoteId,
      status: version.status,
      versionNumber: version.versionNumber,
    },
    recordId: version.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}
