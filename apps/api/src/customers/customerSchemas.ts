import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const optionalInt = z
  .number()
  .int()
  .optional()
  .nullable()
  .transform((value) => value ?? null);

const patchText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value ? value : null;
  });

const patchInt = z
  .number()
  .int()
  .optional()
  .nullable()
  .transform((value) => (value === undefined ? undefined : value));

export function normalizeDocument(value: string | null | undefined): {
  documentNormalized: string | null;
  documentType: "cnpj" | "cpf" | null;
} {
  if (!value) {
    return {
      documentNormalized: null,
      documentType: null,
    };
  }

  const withoutPunctuation = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digitsOnly = value.replace(/\D/g, "");

  if (/^\d{11}$/.test(digitsOnly) && withoutPunctuation === digitsOnly) {
    return {
      documentNormalized: digitsOnly,
      documentType: "cpf",
    };
  }

  if (/^[A-Z0-9]{14}$/.test(withoutPunctuation)) {
    return {
      documentNormalized: withoutPunctuation,
      documentType: "cnpj",
    };
  }

  throw new Error("Invalid document.");
}

export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  let normalized = value.replace(/\D/g, "");

  if ((normalized.length === 12 || normalized.length === 13) && normalized.startsWith("55")) {
    normalized = normalized.slice(2);
  }

  if (!/^\d{10,11}$/.test(normalized)) {
    throw new Error("Invalid phone.");
  }

  return normalized;
}

export function normalizePlate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return normalized || null;
}

export function normalizeVin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return normalized || null;
}

export const customerFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
});

export const createCustomerSchema = z
  .object({
    document: optionalTrimmed(32),
    email: z
      .email()
      .transform((value) => value.toLowerCase())
      .optional()
      .transform((value) => value ?? null),
    name: z.string().trim().min(1).max(160),
    notes: optionalTrimmed(2000),
    phone: optionalTrimmed(32),
  })
  .transform((value) => {
    const document = normalizeDocument(value.document);

    return {
      ...value,
      ...document,
      phoneNormalized: normalizePhone(value.phone),
    };
  });

export const updateCustomerSchema = z
  .object({
    document: optionalTrimmed(32),
    email: z
      .email()
      .transform((value) => value.toLowerCase())
      .optional()
      .nullable(),
    name: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    phone: optionalTrimmed(32),
  })
  .transform((value) => {
    const normalized: typeof value & {
      documentNormalized?: string | null;
      documentType?: "cnpj" | "cpf" | null;
      phoneNormalized?: string | null;
    } = { ...value };

    if (Object.hasOwn(value, "document")) {
      Object.assign(normalized, normalizeDocument(value.document));
    }

    if (Object.hasOwn(value, "phone")) {
      normalized.phoneNormalized = normalizePhone(value.phone);
    }

    return normalized;
  });

export const vehicleFilterSchema = z.object({
  customerId: z.string().trim().min(1).optional(),
  search: z.string().trim().max(120).optional(),
});

export const createVehicleSchema = z
  .object({
    brand: optionalText,
    color: optionalText,
    customerId: z.string().trim().min(1),
    mileage: optionalInt,
    model: optionalText,
    notes: optionalText,
    plate: optionalText,
    vin: optionalText,
    year: optionalInt,
  })
  .transform((value) => ({
    ...value,
    plateNormalized: normalizePlate(value.plate),
    vinNormalized: normalizeVin(value.vin),
  }));

export const updateVehicleSchema = z
  .object({
    brand: patchText,
    color: patchText,
    customerId: z.string().trim().min(1).optional(),
    mileage: patchInt,
    model: patchText,
    notes: patchText,
    plate: patchText,
    vin: patchText,
    year: patchInt,
  })
  .transform((value) => {
    const normalized: typeof value & {
      plateNormalized?: string | null;
      vinNormalized?: string | null;
    } = { ...value };

    if (Object.hasOwn(value, "plate")) {
      normalized.plateNormalized = normalizePlate(value.plate);
    }

    if (Object.hasOwn(value, "vin")) {
      normalized.vinNormalized = normalizeVin(value.vin);
    }

    return normalized;
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerFilters = z.infer<typeof customerFilterSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleFilters = z.infer<typeof vehicleFilterSchema>;
