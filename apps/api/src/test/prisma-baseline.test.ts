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

const forbiddenBusinessOrCommunicationModels = [
  "Customer",
  "Vehicle",
  "Product",
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
