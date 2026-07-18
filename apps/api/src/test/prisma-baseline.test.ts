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

describe("Prisma foundation baseline", () => {
  it("keeps the schema scoped to neutral foundation diagnostics", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toMatch(/model\s+FoundationCheck\b/);
    expect(schema).not.toMatch(
      /model\s+(Tenant|User|Customer|Vehicle|Product|Quote|WorkOrder|Payment|Notification|MessageQueue|WhatsAppIntegration|EmailIntegration)\b/,
    );
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
