const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export type AuthUser = {
  email: string;
  id: string;
  name: string;
  permissions: string[];
  status: string;
  tenantId: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  tenantId: string;
  user: AuthUser;
};

type ApiEnvelope<T> = {
  data: T;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getBootstrapStatus(): Promise<{ bootstrapped: boolean }> {
  return request<{ bootstrapped: boolean }>("/bootstrap/status");
}

export async function createFirstAdmin(input: {
  admin: { email: string; name: string; password: string };
  companySettings?: { tradeName?: string };
  tenant: { document?: string; name: string };
}): Promise<{
  admin: { email: string; id: string; permissions: string[]; tenantId: string };
  companySettings: { id: string; tenantId: string; tradeName: string };
  tenant: { id: string; name: string };
}> {
  return request("/bootstrap/create-first-admin", {
    body: input,
    method: "POST",
    successMessage: "Nao foi possivel criar o primeiro acesso.",
  });
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", {
    body: input,
    method: "POST",
    successMessage: "Email ou senha invalidos.",
  });
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  return request<AuthSession>("/auth/refresh", {
    body: { refreshToken },
    method: "POST",
    successMessage: "Sessao expirada. Entre novamente.",
  });
}

export async function logout(accessToken: string): Promise<void> {
  await request<void>("/auth/logout", {
    accessToken,
    method: "POST",
    successMessage: "Nao foi possivel encerrar a sessao ativa.",
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request("/auth/password-reset/request", {
    body: { email },
    method: "POST",
    successMessage: "Nao foi possivel registrar a solicitacao de recuperacao.",
  });
}

export async function completePasswordReset(input: {
  code: string;
  email: string;
  newPassword: string;
}): Promise<void> {
  await request<void>("/auth/password-reset/complete", {
    body: input,
    method: "POST",
    successMessage: "Codigo ou email invalidos para recuperacao.",
  });
}

export async function changePassword(
  accessToken: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  await request<void>("/auth/change-password", {
    accessToken,
    body: input,
    method: "POST",
    successMessage: "Nao foi possivel alterar a senha.",
  });
}

export async function getCurrentUser(accessToken: string): Promise<{
  session: { expiresAt: string; id: string };
  tenantId: string;
  user: AuthUser;
}> {
  return request("/auth/me", {
    accessToken,
    successMessage: "Nao foi possivel validar a sessao.",
  });
}

async function request<T>(
  path: string,
  options: {
    accessToken?: string;
    body?: unknown;
    method?: string;
    successMessage?: string;
  } = {},
): Promise<T> {
  const init: RequestInit = {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new ApiError(response.status, toErrorMessage(response.status, options.successMessage));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

function toErrorMessage(status: number, fallback = "A API recusou a operacao."): string {
  if (status === 401) {
    return "Sessao invalida. Entre novamente.";
  }

  if (status === 403) {
    return "Acesso bloqueado pela permissao do servidor.";
  }

  return fallback;
}
