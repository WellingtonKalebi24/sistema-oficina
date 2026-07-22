import { Prisma, type StockMovement } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { HttpError } from "../http/errors.js";
import { notFound } from "../tenancy/tenantScope.js";
import type { CreateStockAdjustmentInput, CreateStockExitInput, StockFilters } from "./stockSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

export async function listStockMovements(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: StockFilters,
): Promise<StockMovement[]> {
  return prisma.stockMovement.findMany({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      tenantId,
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.sourceKind ? { sourceKind: filters.sourceKind } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    },
  });
}

export async function createStockExit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateStockExitInput,
): Promise<StockMovement> {
  return prisma.$transaction(async (tx) => {
    const stock = await readLockedProductStock(tx, actor.tenantId, input.productId);
    const nextPhysical = stock.physicalQuantity - input.quantity;
    const nextAvailable = nextPhysical - stock.reservedQuantity;

    if (nextPhysical < 0 || nextAvailable < 0) {
      throw new HttpError(409, "Insufficient available stock.");
    }

    await tx.productStock.update({
      data: {
        physicalQuantity: nextPhysical,
      },
      where: {
        id: stock.id,
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        balanceAfterAvailable: nextAvailable,
        balanceAfterPhysical: nextPhysical,
        balanceAfterReserved: stock.reservedQuantity,
        createdByUserId: actor.userId,
        productId: input.productId,
        quantityDelta: -input.quantity,
        sourceId: null,
        sourceKind: input.sourceKind,
        sourceLabel: input.sourceLabel ?? input.origin,
        tenantId: actor.tenantId,
        type: "exit",
      },
    });

    await writeMovementAudit(tx as PrismaDatabase, actor, movement, "stock.movements.exit");

    return movement;
  });
}

export async function createStockAdjustment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateStockAdjustmentInput,
): Promise<StockMovement> {
  return prisma.$transaction(async (tx) => {
    const stock = await readLockedProductStock(tx, actor.tenantId, input.productId);
    const nextPhysical = stock.physicalQuantity + input.quantityDelta;
    const nextAvailable = nextPhysical - stock.reservedQuantity;

    if (nextPhysical < 0 || nextAvailable < 0) {
      throw new HttpError(409, "Insufficient available stock.");
    }

    await tx.productStock.update({
      data: {
        physicalQuantity: nextPhysical,
      },
      where: {
        id: stock.id,
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        balanceAfterAvailable: nextAvailable,
        balanceAfterPhysical: nextPhysical,
        balanceAfterReserved: stock.reservedQuantity,
        createdByUserId: actor.userId,
        productId: input.productId,
        quantityDelta: input.quantityDelta,
        sourceId: null,
        sourceKind: input.sourceKind,
        sourceLabel: input.sourceLabel,
        tenantId: actor.tenantId,
        type: "adjustment",
      },
    });

    await writeMovementAudit(tx as PrismaDatabase, actor, movement, "stock.movements.adjustment");

    return movement;
  });
}

export function serializeStockMovement(movement: StockMovement) {
  return {
    balanceAfterAvailable: movement.balanceAfterAvailable,
    balanceAfterPhysical: movement.balanceAfterPhysical,
    balanceAfterReserved: movement.balanceAfterReserved,
    createdAt: movement.createdAt.toISOString(),
    id: movement.id,
    productId: movement.productId,
    quantityDelta: movement.quantityDelta,
    sourceId: movement.sourceId,
    sourceKind: movement.sourceKind,
    sourceLabel: movement.sourceLabel,
    tenantId: movement.tenantId,
    type: movement.type,
  };
}

async function readLockedProductStock(
  tx: Prisma.TransactionClient,
  tenantId: string,
  productId: string,
): Promise<{
  id: string;
  physicalQuantity: number;
  reservedQuantity: number;
}> {
  const product = await tx.product.findFirst({
    select: {
      id: true,
    },
    where: {
      deactivatedAt: null,
      id: productId,
      tenantId,
    },
  });

  if (!product) {
    throw notFound();
  }

  await tx.$queryRaw`
    SELECT "id"
    FROM "product_stocks"
    WHERE "tenant_id" = ${tenantId} AND "product_id" = ${productId}
    FOR UPDATE
  `;

  const stock = await tx.productStock.findFirst({
    select: {
      id: true,
      physicalQuantity: true,
      reservedQuantity: true,
    },
    where: {
      productId,
      tenantId,
    },
  });

  if (!stock) {
    throw notFound();
  }

  return stock;
}

async function writeMovementAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  movement: StockMovement,
  action: string,
): Promise<void> {
  await writeAuditLog(prisma, {
    action,
    entity: "stock_movement",
    ipAddress: actor.ipAddress,
    metadata: {
      balanceAfterAvailable: movement.balanceAfterAvailable,
      balanceAfterPhysical: movement.balanceAfterPhysical,
      balanceAfterReserved: movement.balanceAfterReserved,
      productId: movement.productId,
      quantityDelta: movement.quantityDelta,
      sourceKind: movement.sourceKind,
      type: movement.type,
    },
    recordId: movement.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}
