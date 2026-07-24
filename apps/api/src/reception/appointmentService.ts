import { Prisma } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { HttpError, badRequest } from "../http/errors.js";
import { notFound, requireTenantCustomerVehicleLink } from "../tenancy/tenantScope.js";
import type {
  AppointmentListInput,
  CancelAppointmentInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "./receptionSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    customer: {
      select: {
        id: true;
        name: true;
      };
    };
    vehicle: {
      select: {
        id: true;
        plateNormalized: true;
      };
    };
  };
}>;

export async function listAppointments(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: AppointmentListInput,
): Promise<AppointmentWithRelations[]> {
  const range = filters.date ? dayRange(filters.date) : weekRange(filters.weekOf);

  return prisma.appointment.findMany({
    include: appointmentIncludes,
    orderBy: {
      startsAt: "asc",
    },
    where: {
      startsAt: {
        gte: range.start,
        lt: range.end,
      },
      tenantId,
    },
  });
}

export async function createAppointment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateAppointmentInput,
): Promise<AppointmentWithRelations> {
  await requireTenantCustomerVehicleLink(prisma, actor.tenantId, input);

  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        createdByUserId: actor.userId,
        customerId: input.customerId,
        expectedService: input.expectedService,
        notes: input.notes,
        origin: input.origin,
        startsAt: input.startsAt,
        tenantId: actor.tenantId,
        vehicleId: input.vehicleId,
      },
      include: appointmentIncludes,
    });

    await writeAppointmentAudit(
      tx as PrismaDatabase,
      actor,
      appointment,
      "reception.appointments.created",
      ["customerId", "expectedService", "origin", "startsAt", "vehicleId"],
    );

    return appointment;
  });
}

export async function updateAppointment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  appointmentId: string,
  input: UpdateAppointmentInput,
): Promise<AppointmentWithRelations> {
  const current = await requireTenantAppointment(prisma, actor.tenantId, appointmentId);
  const nextCustomerId = input.customerId ?? current.customerId;
  const nextVehicleId = input.vehicleId ?? current.vehicleId;

  if (input.customerId || input.vehicleId) {
    await requireTenantCustomerVehicleLink(prisma, actor.tenantId, {
      customerId: nextCustomerId,
      vehicleId: nextVehicleId,
    });
  }

  if (input.status === "Cancelado") {
    throw badRequest("Use the cancel endpoint to cancel appointments.");
  }

  const updateData: Prisma.AppointmentUncheckedUpdateInput = {};

  if (input.customerId !== undefined) {
    updateData.customerId = input.customerId;
  }

  if (input.vehicleId !== undefined) {
    updateData.vehicleId = input.vehicleId;
  }

  if (input.expectedService !== undefined) {
    updateData.expectedService = input.expectedService;
  }

  if (Object.hasOwn(input, "notes")) {
    updateData.notes = input.notes ?? null;
  }

  if (input.origin !== undefined) {
    updateData.origin = input.origin;
  }

  if (input.startsAt !== undefined) {
    updateData.startsAt = input.startsAt;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      data: updateData,
      include: appointmentIncludes,
      where: {
        id: current.id,
      },
    });

    await writeAppointmentAudit(
      tx as PrismaDatabase,
      actor,
      updated,
      "reception.appointments.updated",
      changedFields(current, input),
    );

    return updated;
  });
}

export async function cancelAppointment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  appointmentId: string,
  input: CancelAppointmentInput,
): Promise<AppointmentWithRelations> {
  const current = await requireTenantAppointment(prisma, actor.tenantId, appointmentId);

  if (current.status === "Convertido") {
    throw new HttpError(409, "Converted appointments cannot be cancelled.");
  }

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.appointment.update({
      data: {
        cancelledAt: new Date(),
        cancelledByUserId: actor.userId,
        status: "Cancelado",
      },
      include: appointmentIncludes,
      where: {
        id: current.id,
      },
    });

    await writeAppointmentAudit(
      tx as PrismaDatabase,
      actor,
      cancelled,
      "reception.appointments.cancelled",
      ["status", "cancelledAt", "cancelledByUserId", ...(input.reason ? ["reason"] : [])],
    );

    return cancelled;
  });
}

export function serializeAppointment(appointment: AppointmentWithRelations) {
  return {
    actions: ["Fazer check-in", "Editar", "Cancelar"],
    cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
    cancelledByUserId: appointment.cancelledByUserId,
    createdAt: appointment.createdAt.toISOString(),
    createdByUserId: appointment.createdByUserId,
    customer: {
      id: appointment.customer.id,
      name: appointment.customer.name,
    },
    customerId: appointment.customerId,
    expectedService: appointment.expectedService,
    id: appointment.id,
    notes: appointment.notes,
    origin: appointment.origin,
    startsAt: appointment.startsAt.toISOString(),
    status: appointment.status,
    tenantId: appointment.tenantId,
    updatedAt: appointment.updatedAt.toISOString(),
    vehicle: {
      id: appointment.vehicle.id,
      plateNormalized: appointment.vehicle.plateNormalized,
    },
    vehicleId: appointment.vehicleId,
  };
}

const appointmentIncludes = {
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      plateNormalized: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

async function requireTenantAppointment(
  prisma: PrismaDatabase,
  tenantId: string,
  appointmentId: string,
) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      tenantId,
    },
  });

  if (!appointment) {
    throw notFound();
  }

  return appointment;
}

async function writeAppointmentAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  appointment: AppointmentWithRelations,
  action: string,
  fields: string[],
): Promise<void> {
  await writeAuditLog(prisma, {
    action,
    entity: "appointment",
    ipAddress: actor.ipAddress,
    metadata: {
      customerId: appointment.customerId,
      fields: fields.filter((field) => field !== "notes").sort(),
      startsAt: appointment.startsAt,
      status: appointment.status,
      vehicleId: appointment.vehicleId,
    },
    recordId: appointment.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}

function changedFields(
  current: Awaited<ReturnType<typeof requireTenantAppointment>>,
  input: UpdateAppointmentInput,
): string[] {
  const fields: string[] = [];

  if (input.customerId !== undefined && input.customerId !== current.customerId) {
    fields.push("customerId");
  }

  if (input.vehicleId !== undefined && input.vehicleId !== current.vehicleId) {
    fields.push("vehicleId");
  }

  if (input.expectedService !== undefined && input.expectedService !== current.expectedService) {
    fields.push("expectedService");
  }

  if (Object.hasOwn(input, "notes") && input.notes !== current.notes) {
    fields.push("notes");
  }

  if (input.origin !== undefined && input.origin !== current.origin) {
    fields.push("origin");
  }

  if (input.status !== undefined && input.status !== current.status) {
    fields.push("status");
  }

  if (input.startsAt !== undefined && input.startsAt.getTime() !== current.startsAt.getTime()) {
    fields.push("startsAt");
  }

  return fields;
}

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 1);

  return { end, start };
}

function weekRange(weekOf: string | undefined) {
  if (!weekOf) {
    throw badRequest("Missing weekly agenda date.");
  }

  const start = new Date(`${weekOf}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  return { end, start };
}
