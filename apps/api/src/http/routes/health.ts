import { Router } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { asyncHandler } from "../errors.js";

export function createHealthRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        status: "ok",
        database: "connected",
        checkedAt: new Date().toISOString(),
      });
    }),
  );

  return router;
}
