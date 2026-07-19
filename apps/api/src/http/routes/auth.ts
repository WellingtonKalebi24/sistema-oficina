import rateLimit from "express-rate-limit";
import { Router } from "express";
import { z } from "zod";

import { completePasswordReset, requestPasswordReset } from "../../auth/passwordReset.js";
import { hashPassword, verifyPassword } from "../../auth/passwords.js";
import { createSession, revokeSession, rotateSessionRefreshToken } from "../../auth/sessions.js";
import { signAccessToken, type AccessTokenConfig } from "../../auth/tokens.js";
import { writeAuditLog } from "../../audit/auditService.js";
import type { ApiEnv } from "../../config/env.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import type { EmailSender } from "../../mail/emailSender.js";
import { asyncHandler, unauthorized } from "../errors.js";
import { resolveAuthContext } from "../middleware/requireAuth.js";

const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});

const resetRequestSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});

const resetCompleteSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  email: z.email().transform((value) => value.toLowerCase()),
  newPassword: z.string().min(8).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export function createAuthRouter(
  prisma: PrismaDatabase,
  env: ApiEnv,
  emailSender: EmailSender,
): Router {
  const router = Router();
  const accessTokenConfig = toAccessTokenConfig(env);
  const authLimiter = rateLimit({
    legacyHeaders: false,
    limit: env.authRateLimitMax,
    standardHeaders: true,
    windowMs: env.authRateLimitWindowMs,
  });

  router.post(
    "/auth/login",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        throw unauthorized();
      }

      const login = await authenticateUser(prisma, parsed.data.email, parsed.data.password);

      if (!login) {
        throw unauthorized();
      }

      const session = await createSession(prisma, {
        ipAddress: req.ip,
        refreshTokenTtlDays: env.refreshTokenTtlDays,
        tenantId: login.user.tenantId,
        userAgent: req.get("user-agent"),
        userId: login.user.id,
      });
      const accessToken = await signAccessToken(accessTokenConfig, {
        sessionId: session.sessionId,
        tenantId: login.user.tenantId,
        userId: login.user.id,
      });

      await prisma.user.update({
        data: {
          lastLoginAt: new Date(),
        },
        where: {
          id: login.user.id,
        },
      });
      await writeAuthAudit(prisma, {
        action: "auth.login.succeeded",
        ipAddress: req.ip,
        recordId: session.sessionId,
        tenantId: login.user.tenantId,
        userAgent: req.get("user-agent"),
        userId: login.user.id,
      });

      res.json({
        data: {
          accessToken,
          refreshToken: session.refreshToken,
          sessionId: session.sessionId,
          tenantId: login.user.tenantId,
          user: serializeUser(login.user, login.permissions),
        },
      });
    }),
  );

  router.post(
    "/auth/refresh",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = refreshSchema.safeParse(req.body);

      if (!parsed.success) {
        throw unauthorized();
      }

      const rotated = await rotateSessionRefreshToken(prisma, {
        refreshToken: parsed.data.refreshToken,
        refreshTokenTtlDays: env.refreshTokenTtlDays,
      });

      if (!rotated) {
        throw unauthorized();
      }

      const accessToken = await signAccessToken(accessTokenConfig, {
        sessionId: rotated.session.id,
        tenantId: rotated.session.tenantId,
        userId: rotated.session.userId,
      });
      const permissions = await getEffectivePermissionKeys(prisma, rotated.session.userId);

      await writeAuthAudit(prisma, {
        action: "auth.session.refreshed",
        ipAddress: req.ip,
        recordId: rotated.session.id,
        tenantId: rotated.session.tenantId,
        userAgent: req.get("user-agent"),
        userId: rotated.session.userId,
      });

      res.json({
        data: {
          accessToken,
          refreshToken: rotated.refreshToken,
          sessionId: rotated.session.id,
          tenantId: rotated.session.tenantId,
          user: serializeUser(rotated.session.user, permissions),
        },
      });
    }),
  );

  router.post(
    "/auth/logout",
    asyncHandler(async (req, res) => {
      const auth = await resolveAuthContext(prisma, accessTokenConfig, req.get("authorization"));

      if (!auth) {
        throw unauthorized();
      }

      await revokeSession(prisma, {
        reason: "logout",
        sessionId: auth.sessionId,
        userId: auth.userId,
      });
      await writeAuthAudit(prisma, {
        action: "auth.logout",
        ipAddress: req.ip,
        recordId: auth.sessionId,
        tenantId: auth.tenantId,
        userAgent: req.get("user-agent"),
        userId: auth.userId,
      });

      res.status(204).send();
    }),
  );

  router.post(
    "/auth/password-reset/request",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = resetRequestSchema.safeParse(req.body);

      if (parsed.success) {
        await requestPasswordReset(prisma, {
          email: parsed.data.email,
          emailSender,
          ipAddress: req.ip,
          resetTtlMinutes: env.passwordResetTtlMinutes,
          userAgent: req.get("user-agent"),
        });
      }

      res.status(202).json({
        data: {
          status: "accepted",
        },
      });
    }),
  );

  router.post(
    "/auth/password-reset/complete",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = resetCompleteSchema.safeParse(req.body);

      if (!parsed.success) {
        throw unauthorized();
      }

      const completed = await completePasswordReset(prisma, {
        code: parsed.data.code,
        email: parsed.data.email,
        ipAddress: req.ip,
        newPassword: parsed.data.newPassword,
        userAgent: req.get("user-agent"),
      });

      if (!completed) {
        throw unauthorized();
      }

      res.status(204).send();
    }),
  );

  router.post(
    "/auth/change-password",
    asyncHandler(async (req, res) => {
      const auth = await resolveAuthContext(prisma, accessTokenConfig, req.get("authorization"));
      const parsed = changePasswordSchema.safeParse(req.body);

      if (!auth || !parsed.success) {
        throw unauthorized();
      }

      const user = await prisma.user.findFirst({
        where: {
          id: auth.userId,
          status: "active",
          tenantId: auth.tenantId,
        },
      });

      if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
        throw unauthorized();
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          data: {
            passwordHash: await hashPassword(parsed.data.newPassword),
          },
          where: {
            id: user.id,
          },
        });
        await writeAuditLog(tx as PrismaDatabase, {
          action: "auth.password.changed",
          entity: "user",
          ipAddress: req.ip,
          metadata: {
            sessionId: auth.sessionId,
          },
          recordId: user.id,
          tenantId: user.tenantId,
          userAgent: req.get("user-agent"),
          userId: user.id,
        });
      });

      res.status(204).send();
    }),
  );

  router.get(
    "/auth/me",
    asyncHandler(async (req, res) => {
      const auth = await resolveAuthContext(prisma, accessTokenConfig, req.get("authorization"));

      if (!auth) {
        throw unauthorized();
      }

      const permissions = await getEffectivePermissionKeys(prisma, auth.userId);

      res.json({
        data: {
          session: {
            expiresAt: auth.session.expiresAt.toISOString(),
            id: auth.sessionId,
          },
          tenantId: auth.tenantId,
          user: serializeUser(auth.session.user, permissions),
        },
      });
    }),
  );

  return router;
}

async function authenticateUser(
  prisma: PrismaDatabase,
  email: string,
  password: string,
): Promise<{
  permissions: string[];
  user: {
    email: string;
    id: string;
    name: string;
    passwordHash: string;
    status: string;
    tenantId: string;
  };
} | null> {
  const users = await prisma.user.findMany({
    where: {
      email,
      status: "active",
    },
  });

  for (const user of users) {
    if (await verifyPassword(user.passwordHash, password)) {
      return {
        permissions: await getEffectivePermissionKeys(prisma, user.id),
        user,
      };
    }
  }

  return null;
}

async function getEffectivePermissionKeys(
  prisma: PrismaDatabase,
  userId: string,
): Promise<string[]> {
  const user = await prisma.user.findUnique({
    include: {
      permissionOverrides: {
        include: {
          permission: true,
        },
      },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
    where: {
      id: userId,
    },
  });

  if (!user) {
    return [];
  }

  const permissions = new Set<string>();

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  for (const override of user.permissionOverrides) {
    if (override.effect === "deny") {
      permissions.delete(override.permission.key);
    } else if (override.effect === "allow") {
      permissions.add(override.permission.key);
    }
  }

  return [...permissions].sort();
}

async function writeAuthAudit(
  prisma: PrismaDatabase,
  input: {
    action: string;
    ipAddress: string | undefined;
    recordId: string;
    tenantId: string;
    userAgent: string | undefined;
    userId: string;
  },
): Promise<void> {
  await writeAuditLog(prisma, {
    action: input.action,
    entity: "session",
    ipAddress: input.ipAddress,
    metadata: {
      sessionId: input.recordId,
    },
    recordId: input.recordId,
    tenantId: input.tenantId,
    userAgent: input.userAgent,
    userId: input.userId,
  });
}

function serializeUser(
  user: { email: string; id: string; name: string; status: string; tenantId: string },
  permissions: string[],
) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    permissions,
    status: user.status,
    tenantId: user.tenantId,
  };
}

function toAccessTokenConfig(env: ApiEnv): AccessTokenConfig {
  return {
    audience: env.jwtAudience,
    issuer: env.jwtIssuer,
    secret: env.jwtAccessSecret,
    ttlSeconds: env.accessTokenTtlSeconds,
  };
}
