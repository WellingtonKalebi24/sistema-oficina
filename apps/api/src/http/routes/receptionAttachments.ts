import path from "node:path";

import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import multer, { diskStorage } from "multer";

import type { PrismaDatabase } from "../../db/prisma.js";
import { readPathId } from "../../customers/customerService.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import {
  createCheckInAttachment,
  deleteCheckInAttachment,
  ensureUploadRoot,
  getCheckInAttachmentDownload,
  listCheckInAttachments,
  serializeAttachment,
} from "../../reception/attachmentService.js";
import { createAttachmentSchema } from "../../reception/receptionSchemas.js";
import { asyncHandler, badRequest } from "../errors.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_EXTENSION_LENGTH = 16;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/octet-stream",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export function createReceptionAttachmentsRouter(
  prisma: PrismaDatabase,
  uploadRoot: string,
): Router {
  const router = Router();
  const upload = createUploadMiddleware(uploadRoot);

  router.get(
    "/reception/check-ins/:checkInId/attachments",
    requirePermission(prisma, PERMISSIONS.receptionAttachmentsRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const checkInId = readPathId(req.params.checkInId);
      const attachments = await listCheckInAttachments(prisma, auth.tenantId, checkInId);

      res.json({
        data: attachments.map(serializeAttachment),
      });
    }),
  );

  router.post(
    "/reception/check-ins/:checkInId/attachments",
    requirePermission(prisma, PERMISSIONS.receptionAttachmentsWrite),
    upload,
    asyncHandler(async (req, res) => {
      const file = readUploadedFile(req);

      try {
        const checkInId = readPathId(req.params.checkInId);
        const input = parseRequest(createAttachmentSchema, req.body, "Invalid attachment data.");
        const attachment = await createCheckInAttachment(
          prisma,
          actorFromRequest(req),
          checkInId,
          input,
          file,
          uploadRoot,
        );

        res.status(201).json({
          data: serializeAttachment(attachment),
        });
      } catch (error) {
        await removeUploadedFile(file);
        throw error;
      }
    }),
  );

  router.get(
    "/reception/check-ins/:checkInId/attachments/:attachmentId/download",
    requirePermission(prisma, PERMISSIONS.receptionAttachmentsRead),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const checkInId = readPathId(req.params.checkInId);
      const attachmentId = readPathId(req.params.attachmentId);
      const download = await getCheckInAttachmentDownload(
        prisma,
        auth.tenantId,
        checkInId,
        attachmentId,
        uploadRoot,
      );

      await new Promise<void>((resolve, reject) => {
        res.download(download.filePath, download.attachment.originalName, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }),
  );

  router.delete(
    "/reception/check-ins/:checkInId/attachments/:attachmentId",
    requirePermission(prisma, PERMISSIONS.receptionAttachmentsDelete),
    asyncHandler(async (req, res) => {
      const checkInId = readPathId(req.params.checkInId);
      const attachmentId = readPathId(req.params.attachmentId);

      await deleteCheckInAttachment(
        prisma,
        actorFromRequest(req),
        checkInId,
        attachmentId,
        uploadRoot,
      );

      res.status(204).send();
    }),
  );

  return router;
}

function createUploadMiddleware(uploadRoot: string): RequestHandler {
  const storage = diskStorage({
    destination(_req, _file, callback) {
      ensureUploadRoot(uploadRoot).then(
        (root) => callback(null, root),
        (error: Error) => callback(error, uploadRoot),
      );
    },
    filename(_req, file, callback) {
      callback(null, `${crypto.randomUUID()}${safeExtension(file.originalname)}`);
    },
  });
  const middleware = multer({
    fileFilter(_req, file, callback) {
      if (ALLOWED_MIME_TYPES.has(file.mimetype) || file.mimetype.startsWith("image/")) {
        callback(null, true);
        return;
      }

      callback(badRequest("Attachment file type is not allowed."), false);
    },
    limits: {
      fields: 2,
      fileSize: MAX_ATTACHMENT_SIZE_BYTES,
      files: 1,
    },
    storage,
  }).single("file");

  return (req: Request, res: Response, next: NextFunction): void => {
    middleware(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      next(badRequest("Invalid attachment upload."));
    });
  };
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
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw badRequest(message);
  }

  return parsed.data;
}

function readUploadedFile(req: Request): Express.Multer.File {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    throw badRequest("Attachment file is required.");
  }

  return file;
}

async function removeUploadedFile(file: Express.Multer.File): Promise<void> {
  const { unlink } = await import("node:fs/promises");

  try {
    await unlink(file.path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function safeExtension(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();

  if (!extension || extension.length > MAX_EXTENSION_LENGTH || !/^\.[a-z0-9]+$/.test(extension)) {
    return "";
  }

  return extension;
}
