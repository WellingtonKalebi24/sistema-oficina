import { z } from "zod";

export const APPOINTMENT_STATUSES = ["Agendado", "Cancelado", "Convertido"] as const;

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

export type AppointmentListInput = z.infer<typeof appointmentListSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
