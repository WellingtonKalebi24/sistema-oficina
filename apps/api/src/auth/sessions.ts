import { createHash, randomBytes } from "node:crypto";

import type { PrismaDatabase } from "../db/prisma.js";

const REFRESH_TOKEN_BYTES = 32;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SessionTokenPair = {
  refreshToken: string;
  sessionId: string;
};

export type ActiveSessionRecord = {
  expiresAt: Date;
  id: string;
  tenantId: string;
  user: {
    email: string;
    id: string;
    name: string;
    status: string;
    tenantId: string;
  };
  userId: string;
};

export async function createSession(
  prisma: PrismaDatabase,
  input: {
    ipAddress: string | undefined;
    refreshTokenTtlDays: number;
    tenantId: string;
    userAgent: string | undefined;
    userId: string;
  },
): Promise<SessionTokenPair> {
  const refreshToken = createRefreshToken();
  const session = await prisma.session.create({
    data: {
      expiresAt: daysFromNow(input.refreshTokenTtlDays),
      ipAddress: input.ipAddress ?? null,
      refreshTokenHash: hashRefreshToken(refreshToken),
      tenantId: input.tenantId,
      userAgent: input.userAgent ?? null,
      userId: input.userId,
    },
  });

  return {
    refreshToken,
    sessionId: session.id,
  };
}

export async function rotateSessionRefreshToken(
  prisma: PrismaDatabase,
  input: {
    refreshToken: string;
    refreshTokenTtlDays: number;
  },
): Promise<{ refreshToken: string; session: ActiveSessionRecord } | null> {
  const nextRefreshToken = createRefreshToken();
  const session = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const existing = await tx.session.findUnique({
      include: {
        user: true,
      },
      where: {
        refreshTokenHash: hashRefreshToken(input.refreshToken),
      },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt <= now ||
      existing.user.status !== "active"
    ) {
      return null;
    }

    return tx.session.update({
      data: {
        expiresAt: daysFromNow(input.refreshTokenTtlDays),
        lastUsedAt: now,
        refreshTokenHash: hashRefreshToken(nextRefreshToken),
      },
      include: {
        user: true,
      },
      where: {
        id: existing.id,
      },
    });
  });

  if (!session) {
    return null;
  }

  return {
    refreshToken: nextRefreshToken,
    session,
  };
}

export async function revokeSession(
  prisma: PrismaDatabase,
  input: {
    reason: string;
    sessionId: string;
    userId: string;
  },
): Promise<boolean> {
  const result = await prisma.session.updateMany({
    data: {
      revokedAt: new Date(),
      revokedReason: input.reason,
    },
    where: {
      id: input.sessionId,
      revokedAt: null,
      userId: input.userId,
    },
  });

  return result.count === 1;
}

export async function getActiveSessionById(
  prisma: PrismaDatabase,
  input: {
    sessionId: string;
    tenantId: string;
    userId: string;
  },
): Promise<ActiveSessionRecord | null> {
  const session = await prisma.session.findFirst({
    include: {
      user: true,
    },
    where: {
      expiresAt: {
        gt: new Date(),
      },
      id: input.sessionId,
      revokedAt: null,
      tenantId: input.tenantId,
      userId: input.userId,
      user: {
        status: "active",
      },
    },
  });

  return session;
}

export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

function createRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * MS_PER_DAY);
}
