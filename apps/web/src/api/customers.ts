import { ApiError } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  data: T;
};

export type Customer = {
  createdAt: string;
  deletedAt: string | null;
  document: string | null;
  documentNormalized: string | null;
  documentType: string | null;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  tenantId: string;
  updatedAt: string;
};

export type CustomerHistoryEvent = {
  createdAt: string;
  id: string;
  metadata: unknown;
  summary: string;
  type: string;
};

export type CustomerInput = {
  document?: string | null;
  email?: string | null;
  name: string;
  notes?: string | null;
  phone?: string | null;
};

export async function listCustomers(
  accessToken: string,
  filters: { search?: string } = {},
): Promise<Customer[]> {
  const query = new URLSearchParams();

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  return request(`/customers${query.size ? `?${query.toString()}` : ""}`, accessToken);
}

export async function createCustomer(accessToken: string, input: CustomerInput): Promise<Customer> {
  return request("/customers", accessToken, {
    body: compactCustomerInput(input),
    method: "POST",
  });
}

export async function updateCustomer(
  accessToken: string,
  customerId: string,
  input: CustomerInput,
): Promise<Customer> {
  return request(`/customers/${customerId}`, accessToken, {
    body: compactCustomerInput(input),
    method: "PATCH",
  });
}

export async function deleteCustomer(accessToken: string, customerId: string): Promise<void> {
  await request<void>(`/customers/${customerId}`, accessToken, {
    method: "DELETE",
  });
}

export async function listCustomerHistory(
  accessToken: string,
  customerId: string,
): Promise<CustomerHistoryEvent[]> {
  return request(`/customers/${customerId}/history`, accessToken);
}

function compactCustomerInput(input: CustomerInput): CustomerInput {
  return {
    document: input.document?.trim() || null,
    email: input.email?.trim() || null,
    name: input.name.trim(),
    notes: input.notes?.trim() || null,
    phone: input.phone?.trim() || null,
  };
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
    const body = (await readErrorBody(response)) as { error?: { message?: string } } | null;
    throw new ApiError(response.status, toErrorMessage(response.status, body?.error?.message));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toErrorMessage(status: number, apiMessage?: string): string {
  if (status === 401) {
    return "Sessao invalida. Entre novamente.";
  }

  if (status === 403) {
    return "Acesso bloqueado pela permissao do servidor.";
  }

  if (status === 409 && apiMessage === "Customer document already exists.") {
    return "Documento ativo ja existe neste tenant.";
  }

  if (status === 400) {
    return "Confira nome, documento, telefone e email do cliente.";
  }

  return "A API de clientes recusou a operacao.";
}
