import { Prisma, type Customer } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";
import { requireTenantCustomer } from "../tenancy/tenantScope.js";
import type { CreateCustomerInput, CustomerFilters, UpdateCustomerInput } from "./customerSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

export async function listCustomers(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: CustomerFilters,
): Promise<Customer[]> {
  const search = filters.search?.trim();
  const normalizedSearch = search?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
  const phoneSearch = search?.replace(/\D/g, "") ?? "";

  return prisma.customer.findMany({
    orderBy: {
      name: "asc",
    },
    where: {
      deletedAt: null,
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              ...(phoneSearch ? [{ phoneNormalized: { contains: phoneSearch } }] : []),
              ...(normalizedSearch
                ? [{ documentNormalized: { contains: normalizedSearch } }]
                : []),
            ],
          }
        : {}),
    },
  });
}

export async function readCustomer(
  prisma: PrismaDatabase,
  tenantId: string,
  customerId: string,
): Promise<Customer> {
  return requireTenantCustomer(prisma, tenantId, customerId) as Promise<Customer>;
}

export async function createCustomer(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateCustomerInput,
): Promise<Customer> {
  await ensureUniqueCustomerDocument(prisma, actor.tenantId, input.documentNormalized);

  return prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        document: input.document,
        documentNormalized: input.documentNormalized,
        documentType: input.documentType,
        email: input.email,
        name: input.name,
        notes: input.notes,
        phone: input.phone,
        phoneNormalized: input.phoneNormalized,
        tenantId: actor.tenantId,
      },
    });

    await tx.customerVehicleHistoryEvent.create({
      data: {
        customerId: created.id,
        metadata: {
          fields: compactFields(input),
        },
        summary: "Cliente criado.",
        tenantId: actor.tenantId,
        type: "customer.created",
        createdByUserId: actor.userId,
      },
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "customers.created",
      entity: "customer",
      ipAddress: actor.ipAddress,
      metadata: {
        fields: compactFields(input),
      },
      recordId: created.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });

    return created;
  });
}

export async function updateCustomer(
  prisma: PrismaDatabase,
  actor: ActorContext,
  customerId: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  await requireTenantCustomer(prisma, actor.tenantId, customerId);

  if (Object.hasOwn(input, "documentNormalized")) {
    await ensureUniqueCustomerDocument(prisma, actor.tenantId, input.documentNormalized ?? null, customerId);
  }

  const updateData: Prisma.CustomerUncheckedUpdateInput = {};

  if (Object.hasOwn(input, "document")) {
    updateData.document = input.document ?? null;
  }

  if (Object.hasOwn(input, "documentNormalized")) {
    updateData.documentNormalized = input.documentNormalized ?? null;
  }

  if (Object.hasOwn(input, "documentType")) {
    updateData.documentType = input.documentType ?? null;
  }

  if (Object.hasOwn(input, "email")) {
    updateData.email = input.email ?? null;
  }

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (Object.hasOwn(input, "notes")) {
    updateData.notes = input.notes ?? null;
  }

  if (Object.hasOwn(input, "phone")) {
    updateData.phone = input.phone ?? null;
  }

  if (Object.hasOwn(input, "phoneNormalized")) {
    updateData.phoneNormalized = input.phoneNormalized ?? null;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      data: updateData,
      where: {
        id: customerId,
      },
    });

    await tx.customerVehicleHistoryEvent.create({
      data: {
        customerId: updated.id,
        metadata: {
          fields: Object.keys(input).sort(),
        },
        summary: "Cliente atualizado.",
        tenantId: actor.tenantId,
        type: "customer.updated",
        createdByUserId: actor.userId,
      },
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "customers.updated",
      entity: "customer",
      ipAddress: actor.ipAddress,
      metadata: {
        fields: Object.keys(input).sort(),
      },
      recordId: updated.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });

    return updated;
  });
}

export async function softDeleteCustomer(
  prisma: PrismaDatabase,
  actor: ActorContext,
  customerId: string,
): Promise<void> {
  await requireTenantCustomer(prisma, actor.tenantId, customerId);

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      data: {
        deletedAt: new Date(),
        deletedByUserId: actor.userId,
      },
      where: {
        id: customerId,
      },
    });

    await tx.customerVehicleHistoryEvent.create({
      data: {
        customerId,
        summary: "Cliente excluido logicamente.",
        tenantId: actor.tenantId,
        type: "customer.deleted",
        createdByUserId: actor.userId,
      },
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "customers.deleted",
      entity: "customer",
      ipAddress: actor.ipAddress,
      recordId: customerId,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });
  });
}

export async function listCustomerHistory(
  prisma: PrismaDatabase,
  tenantId: string,
  customerId: string,
) {
  await requireTenantCustomer(prisma, tenantId, customerId);

  return prisma.customerVehicleHistoryEvent.findMany({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      OR: [
        {
          customerId,
        },
        {
          vehicle: {
            customerId,
            tenantId,
          },
        },
      ],
      tenantId,
    },
  });
}

async function ensureUniqueCustomerDocument(
  prisma: PrismaDatabase,
  tenantId: string,
  documentNormalized: string | null,
  exceptCustomerId?: string,
): Promise<void> {
  if (!documentNormalized) {
    return;
  }

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    documentNormalized,
    tenantId,
  };

  if (exceptCustomerId) {
    where.id = {
      not: exceptCustomerId,
    };
  }

  const duplicate = await prisma.customer.findFirst({
    select: {
      id: true,
    },
    where,
  });

  if (duplicate) {
    throw new HttpError(409, "Customer document already exists.");
  }
}

function compactFields(input: Record<string, unknown>): string[] {
  return Object.keys(input)
    .filter((key) => !["notes", "document", "phone"].includes(key))
    .sort();
}

export function readPathId(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw badRequest("Missing route parameter.");
  }

  return value;
}

export function serializeCustomer(customer: Customer) {
  return {
    createdAt: customer.createdAt.toISOString(),
    deletedAt: customer.deletedAt?.toISOString() ?? null,
    document: customer.document,
    documentNormalized: customer.documentNormalized,
    documentType: customer.documentType,
    email: customer.email,
    id: customer.id,
    name: customer.name,
    notes: customer.notes,
    phone: customer.phone,
    phoneNormalized: customer.phoneNormalized,
    tenantId: customer.tenantId,
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function serializeHistoryEvent(event: {
  createdAt: Date;
  id: string;
  metadata: unknown;
  summary: string;
  type: string;
}) {
  return {
    createdAt: event.createdAt.toISOString(),
    id: event.id,
    metadata: event.metadata,
    summary: event.summary,
    type: event.type,
  };
}
