import type { NextFunction, Request, Response } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { hasPermission } from "../../permissions/permissionService.js";
import type { PermissionKey } from "../../permissions/permissions.js";
import { asyncHandler, forbidden, unauthorized } from "../errors.js";
import type { AuthenticatedRequest } from "./requireAuth.js";

export function requirePermission(prisma: PrismaDatabase, permission: PermissionKey) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as Partial<AuthenticatedRequest>).auth;

    if (!auth) {
      throw unauthorized();
    }

    if (!(await hasPermission(prisma, auth.userId, permission))) {
      throw forbidden();
    }

    next();
  });
}
