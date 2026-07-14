import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export type PrismaDatabase = PrismaClient;

let singleton: PrismaClient | undefined;

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(databaseUrl: string): PrismaClient {
  singleton ??= createPrismaClient(databaseUrl);

  return singleton;
}
