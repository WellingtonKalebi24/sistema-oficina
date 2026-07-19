import { errors as joseErrors } from "jose";
import type { NextFunction, Request, Response } from "express";

import { getActiveSessionById, type ActiveSessionRecord } from "../../auth/sessions.js";
import { verifyAccessToken, type AccessTokenConfig } from "../../auth/tokens.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { asyncHandler, unauthorized } from "../errors.js";

export type AuthContext = {
  session: ActiveSessionRecord;
  sessionId: string;
  tenantId: string;
  userId: string;
};

export type AuthenticatedRequest = Request & {
  auth: AuthContext;
};

export function requireAuth(prisma: PrismaDatabase, config: Omit<AccessTokenConfig, "ttlSeconds">) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const auth = await resolveAuthContext(prisma, config, req.get("authorization"));

    if (!auth) {
      throw unauthorized();
    }

    (req as Request & { auth: AuthContext }).auth = auth;
    next();
  });
}

export async function resolveAuthContext(
  prisma: PrismaDatabase,
  config: Omit<AccessTokenConfig, "ttlSeconds">,
  authorization: string | undefined,
): Promise<AuthContext | null> {
  const token = readBearerToken(authorization);

  if (!token) {
    return null;
  }

  try {
    const claims = await verifyAccessToken(config, token);
    const session = await getActiveSessionById(prisma, {
      sessionId: claims.sessionId,
      tenantId: claims.tenantId,
      userId: claims.userId,
    });

    if (!session) {
      return null;
    }

    return {
      session,
      sessionId: session.id,
      tenantId: session.tenantId,
      userId: session.userId,
    };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError || error instanceof Error) {
      return null;
    }

    throw error;
  }
}

function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}
