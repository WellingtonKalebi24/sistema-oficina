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
  {
    key: "tenant.settings.read",
    name: "Ler configuracoes da oficina",
    description: "Permite consultar configuracoes do tenant autenticado.",
  },
  {
    key: "tenant.settings.update",
    name: "Atualizar configuracoes da oficina",
    description: "Permite alterar configuracoes administrativas do tenant autenticado.",
  },
  {
    key: "users.read",
    name: "Listar usuarios",
    description: "Permite consultar usuarios do tenant autenticado.",
  },
  {
    key: "users.create",
    name: "Criar usuarios",
    description: "Permite criar usuarios comuns no tenant autenticado.",
  },
  {
    key: "users.update",
    name: "Atualizar usuarios",
    description: "Permite editar dados e papeis de usuarios do tenant autenticado.",
  },
  {
    key: "users.deactivate",
    name: "Desativar usuarios",
    description: "Permite desativar usuarios do tenant autenticado.",
  },
  {
    key: "users.createAdmin",
    name: "Criar administradores",
    description: "Permite criar ou conceder permissoes administrativas.",
  },
  {
    key: "roles.manage",
    name: "Gerenciar papeis",
    description: "Permite criar e ajustar papeis do tenant autenticado.",
  },
  {
    key: "permissions.manage",
    name: "Gerenciar permissoes",
    description: "Permite conceder permissoes e overrides especificos por usuario.",
  },
  {
    key: "audit.read",
    name: "Ler auditoria",
    description: "Permite consultar eventos de auditoria do tenant autenticado.",
  },
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
    permissionKeys: ["tenant.settings.read", "users.read"],
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
