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

const forbiddenBusinessOrCommunicationModels = [
  "Quote",
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
    expect(schema).toMatch(
      /physicalQuantity\s+Int\s+@default\(0\)\s+@map\("physical_quantity"\)/,
    );
    expect(schema).toMatch(
      /reservedQuantity\s+Int\s+@default\(0\)\s+@map\("reserved_quantity"\)/,
    );
    expect(schema).toMatch(/deactivatedAt\s+DateTime\?\s+@map\("deactivated_at"\)/);
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
