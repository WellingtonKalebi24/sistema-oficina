import { ApiError } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  data: T;
};

export type Vehicle = {
  brand: string | null;
  color: string | null;
  createdAt: string;
  customer: { id: string; name: string } | null;
  customerId: string;
  deletedAt: string | null;
  id: string;
  mileage: number | null;
  model: string | null;
  notes: string | null;
  plate: string;
  plateNormalized: string;
  tenantId: string;
  updatedAt: string;
  vin: string | null;
  vinNormalized: string | null;
  year: number | null;
};

export type VehicleHistoryEvent = {
  createdAt: string;
  id: string;
  metadata: unknown;
  summary: string;
  type: string;
};

export type VehicleInput = {
  brand?: string | null;
  color?: string | null;
  customerId: string;
  mileage?: number | null;
  model?: string | null;
  notes?: string | null;
  plate: string;
  vin?: string | null;
  year?: number | null;
};

export async function listVehicles(
  accessToken: string,
  filters: { customerId?: string; search?: string } = {},
): Promise<Vehicle[]> {
  const query = new URLSearchParams();

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  if (filters.customerId) {
    query.set("customerId", filters.customerId);
  }

  return request(`/vehicles${query.size ? `?${query.toString()}` : ""}`, accessToken);
}

export async function createVehicle(accessToken: string, input: VehicleInput): Promise<Vehicle> {
  return request("/vehicles", accessToken, {
    body: compactVehicleInput(input),
    method: "POST",
  });
}

export async function updateVehicle(
  accessToken: string,
  vehicleId: string,
  input: VehicleInput,
): Promise<Vehicle> {
  return request(`/vehicles/${vehicleId}`, accessToken, {
    body: compactVehicleInput(input),
    method: "PATCH",
  });
}

export async function deleteVehicle(accessToken: string, vehicleId: string): Promise<void> {
  await request<void>(`/vehicles/${vehicleId}`, accessToken, {
    method: "DELETE",
  });
}

export async function listVehicleHistory(
  accessToken: string,
  vehicleId: string,
): Promise<VehicleHistoryEvent[]> {
  return request(`/vehicles/${vehicleId}/history`, accessToken);
}

function compactVehicleInput(input: VehicleInput): VehicleInput {
  return {
    brand: input.brand?.trim() || null,
    color: input.color?.trim() || null,
    customerId: input.customerId,
    mileage: input.mileage ?? null,
    model: input.model?.trim() || null,
    notes: input.notes?.trim() || null,
    plate: input.plate.trim(),
    vin: input.vin?.trim() || null,
    year: input.year ?? null,
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

  if (status === 409 && apiMessage === "Vehicle plate already exists.") {
    return "Placa ativa ja existe neste tenant.";
  }

  if (status === 409 && apiMessage === "Vehicle VIN already exists.") {
    return "Chassi ativo ja existe neste tenant.";
  }

  if (status === 400) {
    return "Confira cliente, placa, chassi e dados do veiculo.";
  }

  return "A API de veiculos recusou a operacao.";
}
