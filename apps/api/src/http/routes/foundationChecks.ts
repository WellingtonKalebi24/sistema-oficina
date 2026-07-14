import { Router } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { asyncHandler, badRequest } from "../errors.js";

const MAX_LABEL_LENGTH = 120;

type FoundationCheckRecord = {
  id: string;
  label: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function createFoundationChecksRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/foundation-checks",
    asyncHandler(async (_req, res) => {
      const rows = await prisma.foundationCheck.findMany({
        orderBy: { createdAt: "desc" },
      });

      res.json({
        data: rows.map(serializeFoundationCheck),
      });
    }),
  );

  router.post(
    "/foundation-checks",
    asyncHandler(async (req, res) => {
      const label = parseLabel(req.body);
      const record = await prisma.foundationCheck.create({
        data: {
          label,
          status: "recorded",
        },
      });

      res.status(201).json({
        data: serializeFoundationCheck(record),
      });
    }),
  );

  return router;
}

function parseLabel(body: unknown): string {
  if (!body || typeof body !== "object" || !("label" in body)) {
    throw badRequest("label is required.");
  }

  const label = String((body as { label: unknown }).label).trim();

  if (!label) {
    throw badRequest("label is required.");
  }

  if (label.length > MAX_LABEL_LENGTH) {
    throw badRequest(`label must be ${MAX_LABEL_LENGTH} characters or fewer.`);
  }

  return label;
}

function serializeFoundationCheck(record: FoundationCheckRecord) {
  return {
    id: record.id,
    label: record.label,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
