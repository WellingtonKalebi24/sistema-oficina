import { z } from "zod";

export const APPOINTMENT_STATUSES = ["Agendado", "Cancelado", "Convertido"] as const;
export const ATTACHMENT_CATEGORIES = [
  "Avaria",
  "Documento",
  "Painel",
  "Motor",
  "Interior",
  "Outro",
] as const;
export const CHECK_IN_STATUS = "Aguardando diagnostico" as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const appointmentDateTime = z
  .string()
  .trim()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const appointmentListSchema = z
  .object({
    date: dateOnly.optional(),
    weekOf: dateOnly.optional(),
  })
  .refine((value) => Boolean(value.date) !== Boolean(value.weekOf), {
    message: "Provide either date or weekOf.",
  });

export const createAppointmentSchema = z.object({
  customerId: z.string().trim().min(1),
  expectedService: z.string().trim().min(1).max(240),
  notes: optionalText(2000),
  origin: z.string().trim().min(1).max(80),
  startsAt: appointmentDateTime,
  vehicleId: z.string().trim().min(1),
});

export const updateAppointmentSchema = z
  .object({
    customerId: z.string().trim().min(1).optional(),
    expectedService: z.string().trim().min(1).max(240).optional(),
    notes: optionalText(2000),
    origin: z.string().trim().min(1).max(80).optional(),
    startsAt: appointmentDateTime.optional(),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    vehicleId: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const cancelAppointmentSchema = z.object({
  reason: optionalText(500),
});

const checklistItemSchema = z.object({
  condition: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  notes: optionalText(1000),
});

export const checkInListSchema = z.object({
  date: dateOnly.optional(),
  customerId: z.string().trim().min(1).optional(),
  vehicleId: z.string().trim().min(1).optional(),
});

export const createCheckInSchema = z.object({
  appointmentId: z.string().trim().min(1).optional(),
  checklistItems: z.array(checklistItemSchema).min(1),
  customerId: z.string().trim().min(1),
  damageNotes: z.string().trim().min(1).max(4000),
  enteredAt: appointmentDateTime,
  expectedService: z.string().trim().min(1).max(240).optional(),
  fuelLevel: z.string().trim().min(1).max(40),
  itemsLeft: optionalText(2000),
  mileage: z.number().int().nonnegative().optional().nullable(),
  vehicleId: z.string().trim().min(1),
});

export const updateCheckInSchema = z
  .object({
    checklistItems: z.array(checklistItemSchema).min(1).optional(),
    damageNotes: z.string().trim().min(1).max(4000).optional(),
    enteredAt: appointmentDateTime.optional(),
    fuelLevel: z.string().trim().min(1).max(40).optional(),
    itemsLeft: optionalText(2000),
    mileage: z.number().int().nonnegative().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createAttachmentSchema = z.object({
  category: z.enum(ATTACHMENT_CATEGORIES),
});

export type AppointmentListInput = z.infer<typeof appointmentListSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type CheckInListInput = z.infer<typeof checkInListSchema>;
export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type UpdateCheckInInput = z.infer<typeof updateCheckInSchema>;
export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
