import { Prisma, type Vehicle } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { HttpError } from "../http/errors.js";
import { requireTenantCustomer, requireTenantVehicle } from "../tenancy/tenantScope.js";
import type { CreateVehicleInput, UpdateVehicleInput, VehicleFilters } from "./customerSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

type VehicleWithCustomer = Vehicle & {
  customer?: {
    id: string;
    name: string;
  };
};

export async function listVehicles(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: VehicleFilters,
): Promise<VehicleWithCustomer[]> {
  const search = filters.search?.trim();
  const normalizedSearch = search?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";

  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    tenantId,
  };

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (search) {
    where.OR = [
      ...(normalizedSearch ? [{ plateNormalized: { contains: normalizedSearch } }] : []),
      ...(normalizedSearch ? [{ vinNormalized: { contains: normalizedSearch } }] : []),
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  return prisma.vehicle.findMany({
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        plateNormalized: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    where,
  });
}

export async function readVehicle(
  prisma: PrismaDatabase,
  tenantId: string,
  vehicleId: string,
): Promise<VehicleWithCustomer> {
  await requireTenantVehicle(prisma, tenantId, vehicleId);

  return prisma.vehicle.findUniqueOrThrow({
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: {
      id: vehicleId,
    },
  });
}

export async function createVehicle(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateVehicleInput,
): Promise<VehicleWithCustomer> {
  await requireTenantCustomer(prisma, actor.tenantId, input.customerId);
  await ensureUniqueVehicleIdentifiers(prisma, actor.tenantId, {
    plateNormalized: input.plateNormalized,
    vinNormalized: input.vinNormalized,
  });

  return prisma.$transaction(async (tx) => {
    const createData: Prisma.VehicleUncheckedCreateInput = {
      brand: input.brand,
      color: input.color,
      customerId: input.customerId,
      mileage: input.mileage ?? null,
      model: input.model,
      notes: input.notes,
      plate: input.plate,
      plateNormalized: input.plateNormalized,
      tenantId: actor.tenantId,
      vin: input.vin,
      vinNormalized: input.vinNormalized,
      year: input.year ?? null,
    };

    const created = await tx.vehicle.create({
      data: createData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await tx.customerVehicleHistoryEvent.createMany({
      data: [
        {
          customerId: created.customerId,
          metadata: {
            fields: compactVehicleFields(input),
          },
          summary: "Veiculo criado.",
          tenantId: actor.tenantId,
          type: "vehicle.created",
          vehicleId: created.id,
          createdByUserId: actor.userId,
        },
        {
          customerId: created.customerId,
          metadata: {
            customerId: created.customerId,
          },
          summary: "Veiculo vinculado ao cliente atual.",
          tenantId: actor.tenantId,
          type: "vehicle.linked",
          vehicleId: created.id,
          createdByUserId: actor.userId,
        },
      ],
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "vehicles.created",
      entity: "vehicle",
      ipAddress: actor.ipAddress,
      metadata: {
        customerId: created.customerId,
        fields: compactVehicleFields(input),
      },
      recordId: created.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });

    return created;
  });
}

export async function updateVehicle(
  prisma: PrismaDatabase,
  actor: ActorContext,
  vehicleId: string,
  input: UpdateVehicleInput,
): Promise<VehicleWithCustomer> {
  const current = await requireTenantVehicle(prisma, actor.tenantId, vehicleId);

  if (input.customerId !== undefined) {
    await requireTenantCustomer(prisma, actor.tenantId, input.customerId);
  }

  const identifiers: {
    plateNormalized?: string | null;
    vinNormalized?: string | null;
  } = {};

  if (Object.hasOwn(input, "plateNormalized")) {
    identifiers.plateNormalized = input.plateNormalized ?? null;
  }

  if (Object.hasOwn(input, "vinNormalized")) {
    identifiers.vinNormalized = input.vinNormalized ?? null;
  }

  await ensureUniqueVehicleIdentifiers(prisma, actor.tenantId, identifiers, vehicleId);

  const updateData: Prisma.VehicleUncheckedUpdateInput = {};

  if (Object.hasOwn(input, "brand")) {
    updateData.brand = input.brand ?? null;
  }

  if (Object.hasOwn(input, "color")) {
    updateData.color = input.color ?? null;
  }

  if (input.customerId !== undefined) {
    updateData.customerId = input.customerId;
  }

  if (Object.hasOwn(input, "mileage")) {
    updateData.mileage = input.mileage ?? null;
  }

  if (Object.hasOwn(input, "model")) {
    updateData.model = input.model ?? null;
  }

  if (Object.hasOwn(input, "notes")) {
    updateData.notes = input.notes ?? null;
  }

  if (Object.hasOwn(input, "plate")) {
    updateData.plate = input.plate ?? null;
  }

  if (Object.hasOwn(input, "plateNormalized")) {
    updateData.plateNormalized = input.plateNormalized ?? null;
  }

  if (Object.hasOwn(input, "vin")) {
    updateData.vin = input.vin ?? null;
  }

  if (Object.hasOwn(input, "vinNormalized")) {
    updateData.vinNormalized = input.vinNormalized ?? null;
  }

  if (Object.hasOwn(input, "year")) {
    updateData.year = input.year ?? null;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      where: {
        id: vehicleId,
      },
    });

    await tx.customerVehicleHistoryEvent.create({
      data: {
        customerId: updated.customerId,
        metadata: {
          fields: Object.keys(input).sort(),
        },
        summary: "Veiculo atualizado.",
        tenantId: actor.tenantId,
        type: "vehicle.updated",
        vehicleId: updated.id,
        createdByUserId: actor.userId,
      },
    });

    if (input.customerId !== undefined && input.customerId !== current.customerId) {
      await tx.customerVehicleHistoryEvent.create({
        data: {
          customerId: updated.customerId,
          metadata: {
            fromCustomerId: current.customerId,
            toCustomerId: updated.customerId,
          },
          summary: "Veiculo movido para outro cliente atual.",
          tenantId: actor.tenantId,
          type: "vehicle.linked",
          vehicleId: updated.id,
          createdByUserId: actor.userId,
        },
      });
    }

    await writeAuditLog(tx as PrismaDatabase, {
      action: "vehicles.updated",
      entity: "vehicle",
      ipAddress: actor.ipAddress,
      metadata: {
        fields: Object.keys(input).sort(),
        ...(input.customerId !== undefined && input.customerId !== current.customerId
          ? { fromCustomerId: current.customerId, toCustomerId: updated.customerId }
          : {}),
      },
      recordId: updated.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });

    return updated;
  });
}

export async function softDeleteVehicle(
  prisma: PrismaDatabase,
  actor: ActorContext,
  vehicleId: string,
): Promise<void> {
  const vehicle = await requireTenantVehicle(prisma, actor.tenantId, vehicleId);

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({
      data: {
        deletedAt: new Date(),
        deletedByUserId: actor.userId,
      },
      where: {
        id: vehicleId,
      },
    });

    await tx.customerVehicleHistoryEvent.create({
      data: {
        customerId: vehicle.customerId,
        summary: "Veiculo excluido logicamente.",
        tenantId: actor.tenantId,
        type: "vehicle.deleted",
        vehicleId,
        createdByUserId: actor.userId,
      },
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "vehicles.deleted",
      entity: "vehicle",
      ipAddress: actor.ipAddress,
      recordId: vehicleId,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });
  });
}

export async function listVehicleHistory(
  prisma: PrismaDatabase,
  tenantId: string,
  vehicleId: string,
) {
  await requireTenantVehicle(prisma, tenantId, vehicleId);

  return prisma.customerVehicleHistoryEvent.findMany({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      tenantId,
      vehicleId,
    },
  });
}

async function ensureUniqueVehicleIdentifiers(
  prisma: PrismaDatabase,
  tenantId: string,
  input: {
    plateNormalized?: string | null;
    vinNormalized?: string | null;
  },
  exceptVehicleId?: string,
): Promise<void> {
  if (input.plateNormalized) {
    const plateWhere: Prisma.VehicleWhereInput = {
      deletedAt: null,
      plateNormalized: input.plateNormalized,
      tenantId,
    };

    if (exceptVehicleId) {
      plateWhere.id = {
        not: exceptVehicleId,
      };
    }

    const duplicatePlate = await prisma.vehicle.findFirst({
      select: {
        id: true,
      },
      where: plateWhere,
    });

    if (duplicatePlate) {
      throw new HttpError(409, "Vehicle plate already exists.");
    }
  }

  if (input.vinNormalized) {
    const vinWhere: Prisma.VehicleWhereInput = {
      deletedAt: null,
      tenantId,
      vinNormalized: input.vinNormalized,
    };

    if (exceptVehicleId) {
      vinWhere.id = {
        not: exceptVehicleId,
      };
    }

    const duplicateVin = await prisma.vehicle.findFirst({
      select: {
        id: true,
      },
      where: vinWhere,
    });

    if (duplicateVin) {
      throw new HttpError(409, "Vehicle VIN already exists.");
    }
  }
}

function compactVehicleFields(input: Record<string, unknown>): string[] {
  return Object.keys(input)
    .filter((key) => !["notes", "vin"].includes(key))
    .sort();
}

export function serializeVehicle(vehicle: VehicleWithCustomer) {
  return {
    brand: vehicle.brand,
    color: vehicle.color,
    createdAt: vehicle.createdAt.toISOString(),
    customer: vehicle.customer ?? null,
    customerId: vehicle.customerId,
    deletedAt: vehicle.deletedAt?.toISOString() ?? null,
    id: vehicle.id,
    mileage: vehicle.mileage,
    model: vehicle.model,
    notes: vehicle.notes,
    plate: vehicle.plate,
    plateNormalized: vehicle.plateNormalized,
    tenantId: vehicle.tenantId,
    updatedAt: vehicle.updatedAt.toISOString(),
    vin: vehicle.vin,
    vinNormalized: vehicle.vinNormalized,
    year: vehicle.year,
  };
}
