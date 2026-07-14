import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type FoundationCheckWriter = {
  foundationCheck: {
    upsert(args: {
      where: { label: string };
      create: { label: string; status: string };
      update: { status: string };
    }): Promise<unknown>;
  };
};

export const FOUNDATION_SEED = {
  label: "JO.IA local foundation seed",
  status: "recorded",
} as const;

export async function seedFoundationChecks(prisma: FoundationCheckWriter): Promise<void> {
  await prisma.foundationCheck.upsert({
    where: { label: FOUNDATION_SEED.label },
    create: {
      label: FOUNDATION_SEED.label,
      status: FOUNDATION_SEED.status,
    },
    update: {
      status: FOUNDATION_SEED.status,
    },
  });
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed foundation data.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await seedFoundationChecks(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
