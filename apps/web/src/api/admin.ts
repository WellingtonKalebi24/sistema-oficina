import { ApiError } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  data: T;
};

export type TenantSettings = {
  currencyCode: string;
  document: string | null;
  id: string;
  legalName: string | null;
  locale: string;
  tenantId: string;
  timezone: string;
  tradeName: string;
  updatedAt: string;
};

export type AdminUser = {
  createdAt: string;
  deactivatedAt: string | null;
  email: string;
  id: string;
  name: string;
  permissionOverrides: PermissionOverride[];
  roles: Array<{ id: string; key: string; name: string }>;
  status: string;
  tenantId: string;
  updatedAt: string;
};

export type Role = {
  createdAt: string;
  description: string | null;
  id: string;
  isSystem: boolean;
  key: string;
  name: string;
  permissions: string[];
  tenantId: string;
  updatedAt: string;
};

export type Permission = {
  description: string;
  key: string;
  name: string;
};

export type PermissionOverride = {
  effect: "allow" | "deny";
  permissionKey: string;
  reason: string | null;
};

export async function getTenantSettings(accessToken: string): Promise<TenantSettings> {
  return request("/tenant-settings", accessToken);
}

export async function updateTenantSettings(
  accessToken: string,
  input: Partial<
    Pick<TenantSettings, "document" | "legalName" | "locale" | "timezone" | "tradeName">
  >,
): Promise<TenantSettings> {
  return request("/tenant-settings", accessToken, {
    body: input,
    method: "PUT",
  });
}

export async function listUsers(accessToken: string): Promise<AdminUser[]> {
  return request("/users", accessToken);
}

export async function createUser(
  accessToken: string,
  input: { email: string; name: string; password: string; roleIds?: string[] },
): Promise<AdminUser> {
  return request("/users", accessToken, {
    body: input,
    method: "POST",
  });
}

export async function deactivateUser(accessToken: string, userId: string): Promise<AdminUser> {
  return request(`/users/${userId}/deactivate`, accessToken, {
    method: "POST",
  });
}

export async function replacePermissionOverrides(
  accessToken: string,
  userId: string,
  overrides: PermissionOverride[],
): Promise<AdminUser> {
  return request(`/users/${userId}/permission-overrides`, accessToken, {
    body: { overrides },
    method: "PUT",
  });
}

export async function listRoles(accessToken: string): Promise<Role[]> {
  return request("/roles", accessToken);
}

export async function createRole(
  accessToken: string,
  input: { description?: string; key: string; name: string; permissionKeys: string[] },
): Promise<Role> {
  return request("/roles", accessToken, {
    body: input,
    method: "POST",
  });
}

export async function listPermissions(accessToken: string): Promise<Permission[]> {
  return request("/permissions", accessToken);
}

async function request<T>(
  path: string,
  accessToken: string,
  options: { body?: unknown; method?: string } = {},
): Promise<T> {
  const init: RequestInit = {
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${accessToken}`,
    },
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new ApiError(response.status, toErrorMessage(response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

function toErrorMessage(status: number): string {
  if (status === 401) {
    return "Sessao invalida. Entre novamente.";
  }

  if (status === 403) {
    return "Acesso bloqueado pela permissao do servidor.";
  }

  return "A API administrativa recusou a operacao.";
}
