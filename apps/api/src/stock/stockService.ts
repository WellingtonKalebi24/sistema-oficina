import { Prisma, type StockMovement, type StockReservation } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { HttpError } from "../http/errors.js";
import { notFound } from "../tenancy/tenantScope.js";
import type {
  CreateStockAdjustmentInput,
  CreateStockExitInput,
  CreateStockReservationInput,
  StockFilters,
} from "./stockSchemas.js";

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

export async function listStockReservations(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: StockFilters,
): Promise<StockReservation[]> {
  return prisma.stockReservation.findMany({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      tenantId,
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.sourceKind ? { sourceKind: filters.sourceKind } : {}),
      ...(filters.status ? { status: filters.status } : {}),
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

export async function createStockReservation(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateStockReservationInput,
): Promise<StockReservation> {
  return prisma.$transaction(async (tx) => {
    const stock = await readLockedProductStock(tx, actor.tenantId, input.productId);
    const nextReserved = stock.reservedQuantity + input.quantity;
    const nextAvailable = stock.physicalQuantity - nextReserved;

    if (nextAvailable < 0) {
      throw new HttpError(409, "Insufficient available stock.");
    }

    await tx.productStock.update({
      data: {
        reservedQuantity: nextReserved,
      },
      where: {
        id: stock.id,
      },
    });

    const reservation = await tx.stockReservation.create({
      data: {
        createdByUserId: actor.userId,
        productId: input.productId,
        quantity: input.quantity,
        sourceId: input.sourceId,
        sourceKind: input.sourceKind,
        sourceLabel: input.sourceLabel,
        sourceReference: input.sourceReference,
        tenantId: actor.tenantId,
      },
    });

    await tx.stockMovement.create({
      data: {
        balanceAfterAvailable: nextAvailable,
        balanceAfterPhysical: stock.physicalQuantity,
        balanceAfterReserved: nextReserved,
        createdByUserId: actor.userId,
        productId: input.productId,
        quantityDelta: 0,
        sourceId: input.sourceId,
        sourceKind: input.sourceKind,
        sourceLabel: input.sourceLabel ?? input.sourceReference,
        tenantId: actor.tenantId,
        type: "reservation",
      },
    });

    await writeReservationAudit(
      tx as PrismaDatabase,
      actor,
      reservation,
      "stock.reservations.created",
    );

    return reservation;
  });
}

export async function cancelStockReservation(
  prisma: PrismaDatabase,
  actor: ActorContext,
  reservationId: string,
): Promise<StockReservation> {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.stockReservation.findFirst({
      where: {
        id: reservationId,
        tenantId: actor.tenantId,
      },
    });

    if (!reservation) {
      throw notFound();
    }

    if (reservation.status !== "active") {
      throw new HttpError(409, "Reservation is not active.");
    }

    const stock = await readLockedProductStock(tx, actor.tenantId, reservation.productId);
    const nextReserved = stock.reservedQuantity - reservation.quantity;
    const nextAvailable = stock.physicalQuantity - nextReserved;

    if (nextReserved < 0) {
      throw new HttpError(409, "Reservation balance is inconsistent.");
    }

    await tx.productStock.update({
      data: {
        reservedQuantity: nextReserved,
      },
      where: {
        id: stock.id,
      },
    });

    const cancelled = await tx.stockReservation.update({
      data: {
        cancelledAt: new Date(),
        cancelledByUserId: actor.userId,
        status: "cancelled",
      },
      where: {
        id: reservation.id,
      },
    });

    await tx.stockMovement.create({
      data: {
        balanceAfterAvailable: nextAvailable,
        balanceAfterPhysical: stock.physicalQuantity,
        balanceAfterReserved: nextReserved,
        createdByUserId: actor.userId,
        productId: reservation.productId,
        quantityDelta: 0,
        sourceId: reservation.sourceId,
        sourceKind: reservation.sourceKind,
        sourceLabel: reservation.sourceLabel ?? reservation.sourceReference,
        tenantId: actor.tenantId,
        type: "reservation_cancelled",
      },
    });

    await writeReservationAudit(
      tx as PrismaDatabase,
      actor,
      cancelled,
      "stock.reservations.cancelled",
    );

    return cancelled;
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

export function serializeStockReservation(reservation: StockReservation) {
  return {
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    id: reservation.id,
    productId: reservation.productId,
    quantity: reservation.quantity,
    sourceId: reservation.sourceId,
    sourceKind: reservation.sourceKind,
    sourceLabel: reservation.sourceLabel,
    sourceReference: reservation.sourceReference,
    status: reservation.status,
    tenantId: reservation.tenantId,
    updatedAt: reservation.updatedAt.toISOString(),
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

async function writeReservationAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  reservation: StockReservation,
  action: string,
): Promise<void> {
  await writeAuditLog(prisma, {
    action,
    entity: "stock_reservation",
    ipAddress: actor.ipAddress,
    metadata: {
      productId: reservation.productId,
      quantity: reservation.quantity,
      sourceKind: reservation.sourceKind,
      status: reservation.status,
    },
    recordId: reservation.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
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
