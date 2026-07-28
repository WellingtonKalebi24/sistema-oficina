import { Prisma } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";
import { notFound, requireTenantCustomerVehicleLink } from "../tenancy/tenantScope.js";
import type {
  CheckInListInput,
  CreateCheckInInput,
  UpdateCheckInInput,
} from "./receptionSchemas.js";
import { CHECK_IN_STATUS } from "./receptionSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

type CheckInWithRelations = Prisma.ReceptionCheckInGetPayload<{
  include: typeof checkInIncludes;
}>;

type TenantAppointment = Prisma.AppointmentGetPayload<Record<string, never>>;

export async function listCheckIns(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: CheckInListInput,
): Promise<CheckInWithRelations[]> {
  return prisma.receptionCheckIn.findMany({
    include: checkInIncludes,
    orderBy: {
      enteredAt: "desc",
    },
    where: {
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.date ? { enteredAt: dayRange(filters.date) } : {}),
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      tenantId,
    },
  });
}

export async function getCheckIn(
  prisma: PrismaDatabase,
  tenantId: string,
  checkInId: string,
): Promise<CheckInWithRelations> {
  const checkIn = await prisma.receptionCheckIn.findFirst({
    include: checkInIncludes,
    where: {
      id: checkInId,
      tenantId,
    },
  });

  if (!checkIn) {
    throw notFound();
  }

  return checkIn;
}

export async function createCheckIn(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateCheckInInput,
): Promise<CheckInWithRelations> {
  await requireTenantCustomerVehicleLink(prisma, actor.tenantId, input);

  return prisma.$transaction(async (tx) => {
    const appointment = input.appointmentId
      ? await convertExistingAppointment(tx as PrismaDatabase, actor, input)
      : await createConvertedTraceAppointment(tx as PrismaDatabase, actor, input);

    const checkIn = await tx.receptionCheckIn.create({
      data: {
        appointmentId: appointment.id,
        checklist: {
          create: input.checklistItems.map((item) => ({
            condition: item.condition,
            label: item.label,
            notes: item.notes,
            tenantId: actor.tenantId,
          })),
        },
        createdByUserId: actor.userId,
        customerId: input.customerId,
        damageNotes: input.damageNotes,
        enteredAt: input.enteredAt,
        fuelLevel: input.fuelLevel,
        itemsLeft: input.itemsLeft,
        mileage: input.mileage ?? null,
        status: CHECK_IN_STATUS,
        tenantId: actor.tenantId,
        vehicleId: input.vehicleId,
      },
      include: checkInIncludes,
    });

    await writeCheckInAudit(tx as PrismaDatabase, actor, checkIn, "reception.checkins.created", [
      "appointmentId",
      "checklistItems",
      "customerId",
      "damageNotes",
      "enteredAt",
      "fuelLevel",
      "itemsLeft",
      "mileage",
      "vehicleId",
    ]);

    return checkIn;
  });
}

export async function updateCheckIn(
  prisma: PrismaDatabase,
  actor: ActorContext,
  checkInId: string,
  input: UpdateCheckInInput,
): Promise<CheckInWithRelations> {
  const current = await requireTenantCheckIn(prisma, actor.tenantId, checkInId);
  const fields = changedFields(current, input);

  return prisma.$transaction(async (tx) => {
    if (input.checklistItems !== undefined) {
      await tx.receptionChecklistItem.deleteMany({
        where: {
          checkInId: current.id,
          tenantId: actor.tenantId,
        },
      });
    }

    const updated = await tx.receptionCheckIn.update({
      data: {
        ...(input.damageNotes !== undefined ? { damageNotes: input.damageNotes } : {}),
        ...(input.enteredAt !== undefined ? { enteredAt: input.enteredAt } : {}),
        ...(input.fuelLevel !== undefined ? { fuelLevel: input.fuelLevel } : {}),
        ...(Object.hasOwn(input, "itemsLeft") ? { itemsLeft: input.itemsLeft ?? null } : {}),
        ...(input.mileage !== undefined ? { mileage: input.mileage ?? null } : {}),
        ...(input.checklistItems !== undefined
          ? {
              checklist: {
                create: input.checklistItems.map((item) => ({
                  condition: item.condition,
                  label: item.label,
                  notes: item.notes,
                  tenantId: actor.tenantId,
                })),
              },
            }
          : {}),
        updatedByUserId: actor.userId,
      },
      include: checkInIncludes,
      where: {
        id: current.id,
      },
    });

    await writeCheckInAudit(
      tx as PrismaDatabase,
      actor,
      updated,
      "reception.checkins.updated",
      fields,
    );

    return updated;
  });
}

export function serializeCheckIn(checkIn: CheckInWithRelations) {
  return {
    appointment: {
      expectedService: checkIn.appointment.expectedService,
      id: checkIn.appointment.id,
      origin: checkIn.appointment.origin,
      startsAt: checkIn.appointment.startsAt.toISOString(),
      status: checkIn.appointment.status,
    },
    appointmentId: checkIn.appointmentId,
    checklistItems: checkIn.checklist.map((item) => ({
      condition: item.condition,
      id: item.id,
      label: item.label,
      notes: item.notes,
    })),
    createdAt: checkIn.createdAt.toISOString(),
    createdByUserId: checkIn.createdByUserId,
    customer: {
      id: checkIn.customer.id,
      name: checkIn.customer.name,
    },
    customerId: checkIn.customerId,
    damageNotes: checkIn.damageNotes,
    enteredAt: checkIn.enteredAt.toISOString(),
    fuelLevel: checkIn.fuelLevel,
    id: checkIn.id,
    itemsLeft: checkIn.itemsLeft,
    mileage: checkIn.mileage,
    status: checkIn.status,
    tenantId: checkIn.tenantId,
    updatedAt: checkIn.updatedAt.toISOString(),
    updatedByUserId: checkIn.updatedByUserId,
    vehicle: {
      id: checkIn.vehicle.id,
      plateNormalized: checkIn.vehicle.plateNormalized,
    },
    vehicleId: checkIn.vehicleId,
  };
}

const checkInIncludes = {
  appointment: {
    select: {
      expectedService: true,
      id: true,
      origin: true,
      startsAt: true,
      status: true,
    },
  },
  checklist: {
    orderBy: {
      createdAt: "asc",
    },
  },
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
} satisfies Prisma.ReceptionCheckInInclude;

async function convertExistingAppointment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateCheckInInput,
): Promise<TenantAppointment> {
  if (!input.appointmentId) {
    throw badRequest("Appointment ID is required for appointment-origin check-in.");
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      tenantId: actor.tenantId,
    },
  });

  if (!appointment) {
    throw notFound();
  }

  if (appointment.status === "Cancelado") {
    throw new HttpError(409, "Cancelled appointments cannot be converted to check-in.");
  }

  if (appointment.status === "Convertido") {
    throw new HttpError(409, "Appointment already converted to check-in.");
  }

  if (appointment.customerId !== input.customerId || appointment.vehicleId !== input.vehicleId) {
    throw badRequest("Check-in customer and vehicle must match the appointment.");
  }

  const converted = await prisma.appointment.update({
    data: {
      status: "Convertido",
    },
    where: {
      id: appointment.id,
    },
  });

  await writeAppointmentConversionAudit(
    prisma,
    actor,
    converted,
    "reception.appointments.converted",
  );

  return converted;
}

async function createConvertedTraceAppointment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateCheckInInput,
): Promise<TenantAppointment> {
  const appointment = await prisma.appointment.create({
    data: {
      createdByUserId: actor.userId,
      customerId: input.customerId,
      expectedService: input.expectedService ?? "Check-in direto",
      origin: "direct-check-in",
      startsAt: input.enteredAt,
      status: "Convertido",
      tenantId: actor.tenantId,
      vehicleId: input.vehicleId,
    },
  });

  await writeAppointmentConversionAudit(
    prisma,
    actor,
    appointment,
    "reception.appointments.trace_created",
  );
  await writeAppointmentConversionAudit(
    prisma,
    actor,
    appointment,
    "reception.appointments.converted",
  );

  return appointment;
}

async function requireTenantCheckIn(
  prisma: PrismaDatabase,
  tenantId: string,
  checkInId: string,
): Promise<
  Prisma.ReceptionCheckInGetPayload<{
    include: {
      checklist: true;
    };
  }>
> {
  const checkIn = await prisma.receptionCheckIn.findFirst({
    include: {
      checklist: true,
    },
    where: {
      id: checkInId,
      tenantId,
    },
  });

  if (!checkIn) {
    throw notFound();
  }

  return checkIn;
}

async function writeAppointmentConversionAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  appointment: TenantAppointment,
  action: string,
): Promise<void> {
  await writeAuditLog(prisma, {
    action,
    entity: "appointment",
    ipAddress: actor.ipAddress,
    metadata: {
      customerId: appointment.customerId,
      fields: ["status"],
      status: appointment.status,
      vehicleId: appointment.vehicleId,
    },
    recordId: appointment.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}

async function writeCheckInAudit(
  prisma: PrismaDatabase,
  actor: ActorContext,
  checkIn: CheckInWithRelations,
  action: string,
  fields: string[],
): Promise<void> {
  await writeAuditLog(prisma, {
    action,
    entity: "reception_check_in",
    ipAddress: actor.ipAddress,
    metadata: {
      appointmentId: checkIn.appointmentId,
      checklistCount: checkIn.checklist.length,
      customerId: checkIn.customerId,
      fields: fields.filter((field) => field !== "damageNotes").sort(),
      fuelLevel: checkIn.fuelLevel,
      status: checkIn.status,
      vehicleId: checkIn.vehicleId,
    },
    recordId: checkIn.id,
    tenantId: actor.tenantId,
    userAgent: actor.userAgent,
    userId: actor.userId,
  });
}

function changedFields(
  current: Awaited<ReturnType<typeof requireTenantCheckIn>>,
  input: UpdateCheckInInput,
): string[] {
  const fields: string[] = [];

  if (input.damageNotes !== undefined && input.damageNotes !== current.damageNotes) {
    fields.push("damageNotes");
  }

  if (input.enteredAt !== undefined && input.enteredAt.getTime() !== current.enteredAt.getTime()) {
    fields.push("enteredAt");
  }

  if (input.fuelLevel !== undefined && input.fuelLevel !== current.fuelLevel) {
    fields.push("fuelLevel");
  }

  if (Object.hasOwn(input, "itemsLeft") && input.itemsLeft !== current.itemsLeft) {
    fields.push("itemsLeft");
  }

  if (input.mileage !== undefined && input.mileage !== current.mileage) {
    fields.push("mileage");
  }

  if (input.checklistItems !== undefined) {
    fields.push("checklistItems");
  }

  return fields;
}

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 1);

  return {
    gte: start,
    lt: end,
  };
}
