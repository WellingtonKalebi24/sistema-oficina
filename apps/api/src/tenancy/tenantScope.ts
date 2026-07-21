import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";

export function notFound(message = "Resource not found."): HttpError {
  return new HttpError(404, message);
}

export async function requireTenantUser(
  prisma: PrismaDatabase,
  tenantId: string,
  userId: string,
): Promise<{
  email: string;
  id: string;
  name: string;
  status: string;
  tenantId: string;
}> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
    },
  });

  if (!user) {
    throw notFound();
  }

  return user;
}

export async function requireTenantRoleIds(
  prisma: PrismaDatabase,
  tenantId: string,
  roleIds: string[],
): Promise<void> {
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length === 0) {
    return;
  }

  const roles = await prisma.role.findMany({
    select: {
      id: true,
    },
    where: {
      id: {
        in: uniqueRoleIds,
      },
      tenantId,
    },
  });

  if (roles.length !== uniqueRoleIds.length) {
    throw badRequest("All role IDs must belong to the authenticated tenant.");
  }
}

export async function getRolePermissionKeys(
  prisma: PrismaDatabase,
  tenantId: string,
  roleIds: string[],
): Promise<string[]> {
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniqueRoleIds.length === 0) {
    return [];
  }

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    where: {
      id: {
        in: uniqueRoleIds,
      },
      tenantId,
    },
  });

  if (roles.length !== uniqueRoleIds.length) {
    throw badRequest("All role IDs must belong to the authenticated tenant.");
  }

  return roles.flatMap((role) =>
    role.permissions.map((rolePermission) => rolePermission.permission.key),
  );
}

export async function requireTenantCustomer(
  prisma: PrismaDatabase,
  tenantId: string,
  customerId: string,
): Promise<{
  deletedAt: Date | null;
  id: string;
  name: string;
  tenantId: string;
}> {
  const customer = await prisma.customer.findFirst({
    where: {
      deletedAt: null,
      id: customerId,
      tenantId,
    },
  });

  if (!customer) {
    throw notFound();
  }

  return customer;
}

export async function requireTenantVehicle(
  prisma: PrismaDatabase,
  tenantId: string,
  vehicleId: string,
): Promise<{
  customerId: string;
  deletedAt: Date | null;
  id: string;
  tenantId: string;
}> {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      deletedAt: null,
      id: vehicleId,
      tenantId,
    },
  });

  if (!vehicle) {
    throw notFound();
  }

  return vehicle;
}

export async function requireTenantCustomerVehicleLink(
  prisma: PrismaDatabase,
  tenantId: string,
  input: { customerId: string; vehicleId: string },
): Promise<void> {
  const [customer, vehicle] = await Promise.all([
    prisma.customer.findFirst({
      select: {
        id: true,
      },
      where: {
        deletedAt: null,
        id: input.customerId,
        tenantId,
      },
    }),
    prisma.vehicle.findFirst({
      select: {
        id: true,
      },
      where: {
        deletedAt: null,
        id: input.vehicleId,
        tenantId,
      },
    }),
  ]);

  if (!customer || !vehicle) {
    throw badRequest("Customer and vehicle IDs must belong to the authenticated tenant.");
  }
}
