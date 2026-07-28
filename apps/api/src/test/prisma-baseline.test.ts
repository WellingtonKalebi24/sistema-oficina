import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { seedFoundationChecks } from "../../../../prisma/seed.js";

const schemaPath = fileURLToPath(new URL("../../../../prisma/schema.prisma", import.meta.url));

type FoundationCheckDelegate = {
  findMany(args: {
    where: { label: string };
    orderBy: { createdAt: "asc" | "desc" };
  }): Promise<Array<{ label: string; status: string }>>;
};

const requiredIdentityModels = [
  "Tenant",
  "CompanySetting",
  "User",
  "Role",
  "Permission",
  "RolePermission",
  "UserRole",
  "UserPermissionOverride",
  "Session",
  "PasswordResetToken",
  "AuditLog",
] as const;

const requiredCustomerVehicleModels = [
  "Customer",
  "Vehicle",
  "CustomerVehicleHistoryEvent",
] as const;

const requiredStockCatalogModels = [
  "ServiceCatalogEntry",
  "ProductCategory",
  "Product",
  "ProductStock",
  "Supplier",
] as const;

const requiredStockMovementModels = [
  "Purchase",
  "PurchaseItem",
  "StockMovement",
  "StockReservation",
] as const;

const requiredQuoteModels = ["Quote", "QuoteItem"] as const;

const forbiddenBusinessOrCommunicationModels = [
  "WorkOrder",
  "Payment",
  "Notification",
  "NotificationTemplate",
  "NotificationPreference",
  "MessageQueue",
  "WhatsAppIntegration",
  "EmailIntegration",
  "SmsIntegration",
  "CustomerCommunication",
] as const;

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter }) as PrismaClient & {
  foundationCheck: FoundationCheckDelegate;
};

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Prisma schema baseline", () => {
  it("contains the Phase 2 identity, tenant, session, permission and audit contract", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toMatch(/model\s+FoundationCheck\b/);

    for (const model of requiredIdentityModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\b`));
    }

    expect(schema).toMatch(/key\s+String\s+@unique/);
    expect(schema).toMatch(/refreshTokenHash\s+String\s+@map\("refresh_token_hash"\)/);
    expect(schema).toMatch(/revokedAt\s+DateTime\?\s+@map\("revoked_at"\)/);
  });

  it("contains the Phase 3 customer and vehicle data contract", async () => {
    const schema = await readFile(schemaPath, "utf8");

    for (const model of requiredCustomerVehicleModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\b`));
    }

    expect(schema).toMatch(/documentNormalized\s+String\?\s+@map\("document_normalized"\)/);
    expect(schema).toMatch(/plateNormalized\s+String\?\s+@map\("plate_normalized"\)/);
    expect(schema).toMatch(/vinNormalized\s+String\?\s+@map\("vin_normalized"\)/);
    expect(schema).toMatch(/deletedAt\s+DateTime\?\s+@map\("deleted_at"\)/);
    expect(schema).toMatch(/deletedByUserId\s+String\?\s+@map\("deleted_by_user_id"\)/);
  });

  it("contains the Phase 4 service, product, supplier and current stock catalog contract", async () => {
    const schema = await readFile(schemaPath, "utf8");

    for (const model of requiredStockCatalogModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\b`));
    }

    expect(schema).toMatch(/minimumStock\s+Int\s+@default\(0\)\s+@map\("minimum_stock"\)/);
    expect(schema).toMatch(/physicalQuantity\s+Int\s+@default\(0\)\s+@map\("physical_quantity"\)/);
    expect(schema).toMatch(/reservedQuantity\s+Int\s+@default\(0\)\s+@map\("reserved_quantity"\)/);
    expect(schema).toMatch(/deactivatedAt\s+DateTime\?\s+@map\("deactivated_at"\)/);
  });

  it("contains the Phase 4 purchase, purchase item and stock movement ledger contract", async () => {
    const schema = await readFile(schemaPath, "utf8");

    for (const model of requiredStockMovementModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\b`));
    }

    expect(schema).toMatch(/totalAmount\s+Decimal\s+@map\("total_amount"\)/);
    expect(schema).toMatch(/quantityDelta\s+Int\s+@map\("quantity_delta"\)/);
    expect(schema).toMatch(/sourceKind\s+String\s+@map\("source_kind"\)/);
    expect(schema).toMatch(/sourceReference\s+String\?\s+@map\("source_reference"\)/);
    expect(schema).toMatch(/cancelledAt\s+DateTime\?\s+@map\("cancelled_at"\)/);
    expect(schema).toMatch(/balanceAfterPhysical\s+Int\s+@map\("balance_after_physical"\)/);
    expect(schema).toMatch(/balanceAfterReserved\s+Int\s+@map\("balance_after_reserved"\)/);
    expect(schema).toMatch(/balanceAfterAvailable\s+Int\s+@map\("balance_after_available"\)/);
  });

  it("contains the Phase 6 draft quote schema foundation", async () => {
    const schema = await readFile(schemaPath, "utf8");

    for (const model of requiredQuoteModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\b`));
    }

    expect(schema).toMatch(
      /quoteDiscountWarningPercent\s+Decimal\s+@default\(10\.00\)\s+@map\("quote_discount_warning_percent"\)/,
    );
    expect(schema).toMatch(/sourceKind\s+String\s+@map\("source_kind"\)/);
    expect(schema).toMatch(/status\s+String\s+@default\("Rascunho"\)/);
    expect(schema).toMatch(/diagnosisProblema\s+String\?\s+@map\("diagnosis_problema"\)/);
    expect(schema).toMatch(/diagnosisCausa\s+String\?\s+@map\("diagnosis_causa"\)/);
    expect(schema).toMatch(/diagnosisRecomendacao\s+String\?\s+@map\("diagnosis_recomendacao"\)/);
    expect(schema).toMatch(/validUntil\s+DateTime\?\s+@map\("valid_until"\)/);
    expect(schema).toMatch(/estimatedDeliveryAt\s+DateTime\?\s+@map\("estimated_delivery_at"\)/);
    expect(schema).toMatch(/discountWarningTriggered\s+Boolean\s+@default\(false\)/);
  });

  it("keeps out-of-scope business and communication entities out of the schema", async () => {
    const schema = await readFile(schemaPath, "utf8");

    for (const model of forbiddenBusinessOrCommunicationModels) {
      expect(schema).not.toMatch(new RegExp(`model\\s+${model}\\b`, "i"));
    }
  });

  it("seeds one deterministic foundation row and is safe to rerun", async () => {
    await seedFoundationChecks(prisma);
    await seedFoundationChecks(prisma);

    const rows = await prisma.foundationCheck.findMany({
      where: { label: "JO.IA local foundation seed" },
      orderBy: { createdAt: "asc" },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      label: "JO.IA local foundation seed",
      status: "recorded",
    });
  });
});
