import { createHash, randomInt } from "node:crypto";

import { hashPassword } from "./passwords.js";
import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import type { EmailSender } from "../mail/emailSender.js";

const RESET_CODE_MIN = 100000;
const RESET_CODE_MAX_EXCLUSIVE = 1000000;
const MS_PER_MINUTE = 60 * 1000;

export type RequestPasswordResetInput = {
  email: string;
  emailSender: EmailSender;
  ipAddress?: string | undefined;
  resetTtlMinutes: number;
  userAgent?: string | undefined;
};

export type CompletePasswordResetInput = {
  code: string;
  email: string;
  ipAddress?: string | undefined;
  newPassword: string;
  userAgent?: string | undefined;
};

export async function requestPasswordReset(
  prisma: PrismaDatabase,
  input: RequestPasswordResetInput,
): Promise<void> {
  const normalizedEmail = input.email.toLowerCase();
  const users = await prisma.user.findMany({
    where: {
      email: normalizedEmail,
      status: "active",
    },
  });

  if (users.length === 0) {
    return;
  }

  const code = createResetCode();
  const codeHash = hashResetCode(normalizedEmail, code);
  const expiresAt = new Date(Date.now() + input.resetTtlMinutes * MS_PER_MINUTE);

  for (const user of users) {
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.create({
        data: {
          codeHash,
          expiresAt,
          tenantId: user.tenantId,
          userId: user.id,
        },
      });
      await writeAuditLog(tx as PrismaDatabase, {
        action: "auth.password_reset.requested",
        entity: "user",
        ipAddress: input.ipAddress,
        metadata: {
          email: normalizedEmail,
          purpose: "auth_recovery",
        },
        recordId: user.id,
        tenantId: user.tenantId,
        userAgent: input.userAgent,
        userId: user.id,
      });
    });
  }

  await input.emailSender.sendPasswordResetCode({
    code,
    to: normalizedEmail,
  });
}

export async function completePasswordReset(
  prisma: PrismaDatabase,
  input: CompletePasswordResetInput,
): Promise<boolean> {
  const normalizedEmail = input.email.toLowerCase();
  const codeHash = hashResetCode(normalizedEmail, input.code);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const resetToken = await tx.passwordResetToken.findFirst({
      include: {
        user: true,
      },
      where: {
        codeHash,
        expiresAt: {
          gt: now,
        },
        usedAt: null,
        user: {
          email: normalizedEmail,
          status: "active",
        },
      },
    });

    if (!resetToken) {
      return false;
    }

    await tx.passwordResetToken.update({
      data: {
        usedAt: now,
      },
      where: {
        id: resetToken.id,
      },
    });
    await tx.user.update({
      data: {
        passwordHash: await hashPassword(input.newPassword),
      },
      where: {
        id: resetToken.userId,
      },
    });
    await writeAuditLog(tx as PrismaDatabase, {
      action: "auth.password_reset.completed",
      entity: "user",
      ipAddress: input.ipAddress,
      metadata: {
        email: normalizedEmail,
        purpose: "auth_recovery",
      },
      recordId: resetToken.userId,
      tenantId: resetToken.tenantId,
      userAgent: input.userAgent,
      userId: resetToken.userId,
    });

    return true;
  });
}

function createResetCode(): string {
  return randomInt(RESET_CODE_MIN, RESET_CODE_MAX_EXCLUSIVE).toString();
}

function hashResetCode(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}
