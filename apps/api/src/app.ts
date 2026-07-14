import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { DestinationStream, Logger } from "pino";

import { readApiEnv } from "./config/env.js";
import { getPrismaClient, type PrismaDatabase } from "./db/prisma.js";
import { createErrorHandler } from "./http/errors.js";
import { createFoundationChecksRouter } from "./http/routes/foundationChecks.js";
import { createHealthRouter } from "./http/routes/health.js";
import { createLogger } from "./logging/logger.js";

export type CreateAppOptions = {
  enableTestRoutes?: boolean;
  logger?: Logger;
  logStream?: DestinationStream;
  prisma?: PrismaDatabase;
};

export function createApp(options: CreateAppOptions = {}): Express {
  const env = readApiEnv();
  const logger = options.logger ?? createLogger(options.logStream);
  const prisma = options.prisma ?? getPrismaClient(env.databaseUrl);
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
  app.use(createFoundationChecksRouter(prisma));

  if (options.enableTestRoutes) {
    app.get("/__test/forced-error", () => {
      throw new Error("forced failure with secret DATABASE_URL");
    });
  }

  app.use(createErrorHandler(logger));

  return app;
}
