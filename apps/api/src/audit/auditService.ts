import type { Prisma } from "@prisma/client";

import type { PrismaDatabase } from "../db/prisma.js";

const SENSITIVE_KEY_PATTERN = /password|token|code|hash|secret/i;

export type AuditMetadata = Record<string, unknown>;

export type AuditLogInput = {
  action: string;
  entity: string;
  ipAddress?: string | undefined;
  metadata?: AuditMetadata;
  recordId?: string | null;
  tenantId?: string | null;
  userAgent?: string | undefined;
  userId?: string | null;
};

export async function writeAuditLog(
  prisma: PrismaDatabase,
  input: AuditLogInput,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entity: input.entity,
      ipAddress: input.ipAddress ?? null,
      payload: sanitizeAuditMetadata(input.metadata ?? {}) as Prisma.InputJsonValue,
      recordId: input.recordId ?? null,
      tenantId: input.tenantId ?? null,
      userAgent: input.userAgent ?? null,
      userId: input.userId ?? null,
    },
  });
}

export function sanitizeAuditMetadata(metadata: AuditMetadata): Record<string, unknown> {
  return sanitizeObject(metadata);
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return String(value);
}

function sanitizeObject(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }

    sanitized[key] = sanitizeValue(nestedValue);
  }

  return sanitized;
}
