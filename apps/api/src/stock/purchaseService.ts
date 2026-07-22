import { Prisma, type Purchase, type PurchaseItem, type StockMovement } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { notFound } from "../tenancy/tenantScope.js";
import type { CreatePurchaseInput } from "./stockSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

type PurchaseWithItems = Purchase & {
  items: Array<PurchaseItem & { stockMovement: StockMovement | null }>;
};

export async function createPurchase(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreatePurchaseInput,
): Promise<PurchaseWithItems> {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({
      where: {
        deactivatedAt: null,
        id: input.supplierId,
        tenantId: actor.tenantId,
      },
    });

    if (!supplier) {
      throw notFound();
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      select: {
        id: true,
      },
      where: {
        deactivatedAt: null,
        id: {
          in: productIds,
        },
        tenantId: actor.tenantId,
      },
    });

    if (products.length !== productIds.length) {
      throw notFound();
    }

    const totalAmount = input.items.reduce(
      (total, item) => total.plus(new Prisma.Decimal(item.unitCost).mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const purchase = await tx.purchase.create({
      data: {
        createdByUserId: actor.userId,
        documentNumber: input.documentNumber,
        purchasedAt: input.purchasedAt,
        supplierId: input.supplierId,
        tenantId: actor.tenantId,
        totalAmount,
      },
    });

    for (const item of input.items) {
      await lockProductStock(tx, actor.tenantId, item.productId);

      const stock = await tx.productStock.findFirst({
        where: {
          productId: item.productId,
          tenantId: actor.tenantId,
        },
      });

      if (!stock) {
        throw notFound();
      }

      const nextPhysical = stock.physicalQuantity + item.quantity;
      const nextAvailable = nextPhysical - stock.reservedQuantity;
      const purchaseItem = await tx.purchaseItem.create({
        data: {
          productId: item.productId,
          purchaseId: purchase.id,
          quantity: item.quantity,
          tenantId: actor.tenantId,
          totalCost: new Prisma.Decimal(item.unitCost).mul(item.quantity),
          unitCost: new Prisma.Decimal(item.unitCost),
        },
      });

      await tx.productStock.update({
        data: {
          physicalQuantity: nextPhysical,
        },
        where: {
          id: stock.id,
        },
      });

      await tx.stockMovement.create({
        data: {
          balanceAfterAvailable: nextAvailable,
          balanceAfterPhysical: nextPhysical,
          balanceAfterReserved: stock.reservedQuantity,
          createdByUserId: actor.userId,
          productId: item.productId,
          purchaseItemId: purchaseItem.id,
          quantityDelta: item.quantity,
          sourceId: purchase.id,
          sourceKind: "purchase",
          sourceLabel: input.documentNumber,
          tenantId: actor.tenantId,
          type: "entry",
        },
      });
    }

    await writeAuditLog(tx as PrismaDatabase, {
      action: "stock.purchases.created",
      entity: "purchase",
      ipAddress: actor.ipAddress,
      metadata: {
        itemCount: input.items.length,
        productIds,
        supplierId: input.supplierId,
        totalAmount: totalAmount.toFixed(2),
      },
      recordId: purchase.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "stock.movements.entry",
      entity: "stock_movement",
      ipAddress: actor.ipAddress,
      metadata: {
        productIds,
        purchaseId: purchase.id,
        quantityDelta: input.items.reduce((total, item) => total + item.quantity, 0),
        sourceKind: "purchase",
      },
      recordId: purchase.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });

    return readPurchase(tx as PrismaDatabase, actor.tenantId, purchase.id);
  });
}

export async function readPurchase(
  prisma: PrismaDatabase,
  tenantId: string,
  purchaseId: string,
): Promise<PurchaseWithItems> {
  const purchase = await prisma.purchase.findFirst({
    include: {
      items: {
        include: {
          stockMovement: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
    where: {
      id: purchaseId,
      tenantId,
    },
  });

  if (!purchase) {
    throw notFound();
  }

  return purchase;
}

export function serializePurchase(purchase: PurchaseWithItems) {
  return {
    createdAt: purchase.createdAt.toISOString(),
    documentNumber: purchase.documentNumber,
    id: purchase.id,
    itemCount: purchase.items.length,
    items: purchase.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      stockMovementId: item.stockMovement?.id ?? null,
      totalCost: item.totalCost.toFixed(2),
      unitCost: item.unitCost.toFixed(2),
    })),
    purchasedAt: purchase.purchasedAt.toISOString(),
    supplierId: purchase.supplierId,
    tenantId: purchase.tenantId,
    totalAmount: purchase.totalAmount.toFixed(2),
    updatedAt: purchase.updatedAt.toISOString(),
  };
}

async function lockProductStock(
  tx: Prisma.TransactionClient,
  tenantId: string,
  productId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT "id"
    FROM "product_stocks"
    WHERE "tenant_id" = ${tenantId} AND "product_id" = ${productId}
    FOR UPDATE
  `;
}
