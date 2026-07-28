import { Router } from "express";

import { readPathId } from "../../customers/customerService.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import {
  cancelQuote,
  createNewQuoteVersionDraft,
  createQuoteApprovalLink,
  createQuote,
  getPublishedQuoteVersion,
  getQuote,
  listQuotes,
  markQuoteSent,
  publishQuoteVersion,
  serializeQuote,
  serializeQuoteVersion,
  updateQuoteDraft,
} from "../../quotes/quoteService.js";
import { renderQuotePdf } from "../../quotes/quotePdf.js";
import {
  quoteApprovalLinkSchema,
  createQuoteSchema,
  quoteListSchema,
  updateQuoteDraftSchema,
} from "../../quotes/quoteSchemas.js";
import { asyncHandler, badRequest } from "../errors.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";

export function createQuotesRouter(prisma: PrismaDatabase): Router {
  const router = Router();

  router.get(
    "/quotes",
    requirePermission(prisma, PERMISSIONS.quotesRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const filters = parseRequest(quoteListSchema, req.query, "Invalid quote filters.");
      const quotes = await listQuotes(prisma, auth.tenantId, filters);

      res.json({
        data: quotes.map(serializeQuote),
      });
    }),
  );

  router.get(
    "/quotes/:quoteId",
    requirePermission(prisma, PERMISSIONS.quotesRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const quoteId = readPathId(req.params.quoteId);
      const quote = await getQuote(prisma, auth.tenantId, quoteId);

      res.json({
        data: serializeQuote(quote),
      });
    }),
  );

  router.post(
    "/quotes",
    requirePermission(prisma, PERMISSIONS.quotesWrite),
    asyncHandler(async (req, res) => {
      const input = parseRequest(createQuoteSchema, req.body, "Invalid quote data.");
      const quote = await createQuote(prisma, actorFromRequest(req), input);

      res.status(201).json({
        data: serializeQuote(quote),
      });
    }),
  );

  router.post(
    "/quotes/:quoteId/publish",
    requirePermission(prisma, PERMISSIONS.quotesPublish),
    asyncHandler(async (req, res) => {
      const quoteId = readPathId(req.params.quoteId);
      const version = await publishQuoteVersion(prisma, actorFromRequest(req), quoteId);

      res.status(201).json({
        data: serializeQuoteVersion(version),
      });
    }),
  );

  router.post(
    "/quotes/:quoteId/new-version",
    requirePermission(prisma, PERMISSIONS.quotesWrite),
    asyncHandler(async (req, res) => {
      const quoteId = readPathId(req.params.quoteId);
      const quote = await createNewQuoteVersionDraft(prisma, actorFromRequest(req), quoteId);

      res.status(201).json({
        data: serializeQuote(quote),
      });
    }),
  );

  router.get(
    "/quotes/:quoteId/versions/:versionId",
    requirePermission(prisma, PERMISSIONS.quotesRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const quoteId = readPathId(req.params.quoteId);
      const versionId = readPathId(req.params.versionId);
      const version = await getPublishedQuoteVersion(prisma, auth.tenantId, quoteId, versionId);

      res.json({
        data: serializeQuoteVersion(version),
      });
    }),
  );

  router.get(
    "/quotes/:quoteId/versions/:versionId/pdf",
    requirePermission(prisma, PERMISSIONS.quotesPdf),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const quoteId = readPathId(req.params.quoteId);
      const versionId = readPathId(req.params.versionId);
      const version = await getPublishedQuoteVersion(prisma, auth.tenantId, quoteId, versionId);
      const pdf = await renderQuotePdf(version);

      res.type("application/pdf");
      res.attachment(`orcamento-${version.versionNumber}.pdf`);
      res.status(200).send(pdf);
    }),
  );

  router.post(
    "/quotes/:quoteId/versions/:versionId/link",
    requirePermission(prisma, PERMISSIONS.quotesLink),
    asyncHandler(async (req, res) => {
      const quoteId = readPathId(req.params.quoteId);
      const versionId = readPathId(req.params.versionId);
      const input = parseRequest(
        quoteApprovalLinkSchema,
        req.body,
        "Invalid quote approval link data.",
      );
      const link = await createQuoteApprovalLink(
        prisma,
        actorFromRequest(req),
        quoteId,
        versionId,
        input,
        `${req.protocol}://${req.get("host")}`,
      );

      res.status(201).json({
        data: link,
      });
    }),
  );

  router.post(
    "/quotes/:quoteId/mark-sent",
    requirePermission(prisma, PERMISSIONS.quotesStatus),
    asyncHandler(async (req, res) => {
      const quoteId = readPathId(req.params.quoteId);
      const version = await markQuoteSent(prisma, actorFromRequest(req), quoteId);

      res.json({
        data: serializeQuoteVersion(version),
      });
    }),
  );

  router.post(
    "/quotes/:quoteId/cancel",
    requirePermission(prisma, PERMISSIONS.quotesStatus),
    asyncHandler(async (req, res) => {
      const quoteId = readPathId(req.params.quoteId);
      const version = await cancelQuote(prisma, actorFromRequest(req), quoteId);

      res.json({
        data: serializeQuoteVersion(version),
      });
    }),
  );

  router.patch(
    "/quotes/:quoteId",
    requirePermission(prisma, PERMISSIONS.quotesWrite),
    asyncHandler(async (req, res) => {
      const quoteId = readPathId(req.params.quoteId);
      const input = parseRequest(updateQuoteDraftSchema, req.body, "Invalid quote data.");
      const quote = await updateQuoteDraft(prisma, actorFromRequest(req), quoteId, input);

      res.json({
        data: serializeQuote(quote),
      });
    }),
  );

  return router;
}

function actorFromRequest(req: unknown) {
  const authenticatedReq = req as AuthenticatedRequest;

  return {
    ipAddress: authenticatedReq.ip,
    tenantId: authenticatedReq.auth.tenantId,
    userAgent: authenticatedReq.get("user-agent"),
    userId: authenticatedReq.auth.userId,
  };
}

function parseRequest<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  message: string,
): T {
  try {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      throw badRequest(message);
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === "HttpError") {
      throw error;
    }

    throw badRequest(message);
  }
}
