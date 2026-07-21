import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  ALL_PERMISSIONS,
  PERMISSION_DETAILS,
  PERMISSIONS,
} from "../apps/api/src/permissions/permissions.js";

type FoundationCheckWriter = {
  foundationCheck: {
    upsert(args: {
      where: { label: string };
      create: { label: string; status: string };
      update: { status: string };
    }): Promise<unknown>;
  };
  permission?: {
    upsert(args: {
      where: { key: string };
      create: { key: string; name: string; description: string };
      update: { name: string; description: string };
    }): Promise<unknown>;
  };
};

export const FOUNDATION_SEED = {
  label: "JO.IA local foundation seed",
  status: "recorded",
} as const;

export const IDENTITY_PERMISSION_SEED = [
  ...ALL_PERMISSIONS.map((permissionKey) => ({
    description: PERMISSION_DETAILS[permissionKey].description,
    key: permissionKey,
    name: PERMISSION_DETAILS[permissionKey].name,
  })),
] as const;

export const DEFAULT_ROLE_TEMPLATES = [
  {
    key: "admin",
    name: "Administrador",
    permissionKeys: IDENTITY_PERMISSION_SEED.map((permission) => permission.key),
  },
  {
    key: "operator",
    name: "Operador",
    permissionKeys: [
      PERMISSIONS.tenantSettingsRead,
      PERMISSIONS.usersRead,
      PERMISSIONS.customersRead,
      PERMISSIONS.customersCreate,
      PERMISSIONS.customersUpdate,
      PERMISSIONS.vehiclesRead,
      PERMISSIONS.vehiclesCreate,
      PERMISSIONS.vehiclesUpdate,
    ],
  },
] as const;

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

export async function seedIdentityPermissions(prisma: FoundationCheckWriter): Promise<void> {
  if (!prisma.permission) {
    return;
  }

  for (const permission of IDENTITY_PERMISSION_SEED) {
    await prisma.permission.upsert({
      where: {
        key: permission.key,
      },
      create: permission,
      update: {
        name: permission.name,
        description: permission.description,
      },
    });
  }
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
    await seedIdentityPermissions(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
