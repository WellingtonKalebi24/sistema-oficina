import { constants } from "node:fs";
import { access, mkdir, unlink } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";
import { notFound } from "../tenancy/tenantScope.js";
import type { CreateAttachmentInput } from "./receptionSchemas.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};

type UploadedAttachmentFile = {
  filename: string;
  mimetype: string;
  originalname: string;
  path: string;
  size: number;
};

type AttachmentRecord = Prisma.CheckInAttachmentGetPayload<Record<string, never>>;

export type AttachmentDownload = {
  attachment: AttachmentRecord;
  filePath: string;
};

export async function createCheckInAttachment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  checkInId: string,
  input: CreateAttachmentInput,
  file: UploadedAttachmentFile,
  uploadRoot: string,
): Promise<AttachmentRecord> {
  if (!file) {
    throw badRequest("Attachment file is required.");
  }

  await requireTenantCheckIn(prisma, actor.tenantId, checkInId);

  const root = resolveUploadRoot(uploadRoot);
  const filePath = resolveStoragePath(root, file.filename);
  const actualPath = path.resolve(file.path);

  if (actualPath !== filePath) {
    await removeFileIfExists(actualPath);
    throw badRequest("Invalid attachment storage path.");
  }

  const attachment = await prisma.$transaction(async (tx) => {
    const created = await tx.checkInAttachment.create({
      data: {
        category: input.category,
        checkInId,
        mimeType: file.mimetype,
        originalName: file.originalname,
        relativePath: file.filename,
        sizeBytes: file.size,
        storedName: file.filename,
        tenantId: actor.tenantId,
        uploadedByUserId: actor.userId,
      },
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "reception.attachments.uploaded",
      entity: "check_in_attachment",
      ipAddress: actor.ipAddress,
      metadata: {
        category: created.category,
        checkInId: created.checkInId,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
      },
      recordId: created.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });

    return created;
  });

  return attachment;
}

export async function listCheckInAttachments(
  prisma: PrismaDatabase,
  tenantId: string,
  checkInId: string,
): Promise<AttachmentRecord[]> {
  await requireTenantCheckIn(prisma, tenantId, checkInId);

  return prisma.checkInAttachment.findMany({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      checkInId,
      deletedAt: null,
      tenantId,
    },
  });
}

export async function getCheckInAttachmentDownload(
  prisma: PrismaDatabase,
  tenantId: string,
  checkInId: string,
  attachmentId: string,
  uploadRoot: string,
): Promise<AttachmentDownload> {
  const attachment = await requireActiveTenantAttachment(prisma, tenantId, checkInId, attachmentId);
  const filePath = resolveStoragePath(resolveUploadRoot(uploadRoot), attachment.relativePath);

  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new HttpError(404, "Attachment file not found.");
  }

  return {
    attachment,
    filePath,
  };
}

export async function deleteCheckInAttachment(
  prisma: PrismaDatabase,
  actor: ActorContext,
  checkInId: string,
  attachmentId: string,
  uploadRoot: string,
): Promise<void> {
  const attachment = await requireActiveTenantAttachment(
    prisma,
    actor.tenantId,
    checkInId,
    attachmentId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.checkInAttachment.update({
      data: {
        deletedAt: new Date(),
        deletedByUserId: actor.userId,
      },
      where: {
        id: attachment.id,
      },
    });

    await writeAuditLog(tx as PrismaDatabase, {
      action: "reception.attachments.deleted",
      entity: "check_in_attachment",
      ipAddress: actor.ipAddress,
      metadata: {
        category: attachment.category,
        checkInId: attachment.checkInId,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      },
      recordId: attachment.id,
      tenantId: actor.tenantId,
      userAgent: actor.userAgent,
      userId: actor.userId,
    });
  });

  await removeFileIfExists(
    resolveStoragePath(resolveUploadRoot(uploadRoot), attachment.relativePath),
  );
}

export function serializeAttachment(attachment: AttachmentRecord) {
  return {
    category: attachment.category,
    checkInId: attachment.checkInId,
    createdAt: attachment.createdAt.toISOString(),
    deletedAt: attachment.deletedAt?.toISOString() ?? null,
    id: attachment.id,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    sizeBytes: attachment.sizeBytes,
    storedName: attachment.storedName,
    tenantId: attachment.tenantId,
    uploadedByUserId: attachment.uploadedByUserId,
  };
}

export async function ensureUploadRoot(uploadRoot: string): Promise<string> {
  const root = resolveUploadRoot(uploadRoot);
  await mkdir(root, { recursive: true });

  return root;
}

export function resolveUploadRoot(uploadRoot: string): string {
  return path.resolve(uploadRoot);
}

function resolveStoragePath(uploadRoot: string, relativePath: string): string {
  const resolvedRoot = resolveUploadRoot(uploadRoot);
  const resolved = path.resolve(resolvedRoot, relativePath);

  if (resolved !== resolvedRoot && resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    return resolved;
  }

  throw new HttpError(500, "Attachment storage path is invalid.");
}

async function requireTenantCheckIn(
  prisma: PrismaDatabase,
  tenantId: string,
  checkInId: string,
): Promise<void> {
  const checkIn = await prisma.receptionCheckIn.findFirst({
    select: {
      id: true,
    },
    where: {
      id: checkInId,
      tenantId,
    },
  });

  if (!checkIn) {
    throw notFound();
  }
}

async function requireActiveTenantAttachment(
  prisma: PrismaDatabase,
  tenantId: string,
  checkInId: string,
  attachmentId: string,
): Promise<AttachmentRecord> {
  const attachment = await prisma.checkInAttachment.findFirst({
    where: {
      checkInId,
      deletedAt: null,
      id: attachmentId,
      tenantId,
    },
  });

  if (!attachment) {
    throw notFound();
  }

  return attachment;
}

async function removeFileIfExists(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}
