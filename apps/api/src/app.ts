import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { DestinationStream, Logger } from "pino";

import { readApiEnv } from "./config/env.js";
import { getPrismaClient, type PrismaDatabase } from "./db/prisma.js";
import { createErrorHandler } from "./http/errors.js";
import { requireAuth } from "./http/middleware/requireAuth.js";
import { createAuthRouter } from "./http/routes/auth.js";
import { createBootstrapRouter } from "./http/routes/bootstrap.js";
import { createCustomersRouter } from "./http/routes/customers.js";
import { createFoundationChecksRouter } from "./http/routes/foundationChecks.js";
import { createHealthRouter } from "./http/routes/health.js";
import { createRolesRouter } from "./http/routes/roles.js";
import { createStockCatalogRouter } from "./http/routes/stockCatalog.js";
import { createTenantSettingsRouter } from "./http/routes/tenantSettings.js";
import { createUsersRouter } from "./http/routes/users.js";
import { createVehiclesRouter } from "./http/routes/vehicles.js";
import { createLogger } from "./logging/logger.js";
import { createEmailSender, type EmailSender } from "./mail/emailSender.js";

export type CreateAppOptions = {
  enableTestRoutes?: boolean;
  emailSender?: EmailSender;
  logger?: Logger;
  logStream?: DestinationStream;
  prisma?: PrismaDatabase;
};

export function createApp(options: CreateAppOptions = {}): Express {
  const env = readApiEnv();
  const logger = options.logger ?? createLogger(options.logStream);
  const prisma = options.prisma ?? getPrismaClient(env.databaseUrl);
  const emailSender = options.emailSender ?? createEmailSender(env);
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.webOrigin,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
    }),
  );

  app.use(createHealthRouter(prisma));
  app.use(createBootstrapRouter(prisma));
  app.use(createAuthRouter(prisma, env, emailSender));
  app.use(createFoundationChecksRouter(prisma));

  if (options.enableTestRoutes) {
    app.get("/__test/forced-error", () => {
      throw new Error("forced failure with secret DATABASE_URL");
    });
  }

  app.use(
    requireAuth(prisma, {
      audience: env.jwtAudience,
      issuer: env.jwtIssuer,
      secret: env.jwtAccessSecret,
    }),
  );
  app.use(createCustomersRouter(prisma));
  app.use(createVehiclesRouter(prisma));
  app.use(createStockCatalogRouter(prisma));
  app.use(createTenantSettingsRouter(prisma));
  app.use(createUsersRouter(prisma));
  app.use(createRolesRouter(prisma));

  app.use(createErrorHandler(logger));

  return app;
}
