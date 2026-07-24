import { ApiError } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  data: T;
};

export type AppointmentStatus = "Agendado" | "Cancelado" | "Convertido";

export type Appointment = {
  actions: Array<"Fazer check-in" | "Editar" | "Cancelar">;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  createdAt: string;
  createdByUserId: string | null;
  customer: { id: string; name: string };
  customerId: string;
  expectedService: string;
  id: string;
  notes: string | null;
  origin: string;
  startsAt: string;
  status: AppointmentStatus;
  tenantId: string;
  updatedAt: string;
  vehicle: { id: string; plateNormalized: string | null };
  vehicleId: string;
};

export type AppointmentListFilters =
  | {
      date: string;
      weekOf?: never;
    }
  | {
      date?: never;
      weekOf: string;
    };

export type AppointmentInput = {
  customerId: string;
  expectedService: string;
  notes?: string | null;
  origin: string;
  startsAt: string;
  vehicleId: string;
};

export type AppointmentUpdateInput = Partial<AppointmentInput> & {
  status?: AppointmentStatus;
};

export type AppointmentCancelInput = {
  reason?: string | null;
};

export async function listAppointments(
  accessToken: string,
  filters: AppointmentListFilters,
): Promise<Appointment[]> {
  return request(`/reception/appointments${toQuery(filters)}`, accessToken);
}

export async function createAppointment(
  accessToken: string,
  input: AppointmentInput,
): Promise<Appointment> {
  return request("/reception/appointments", accessToken, {
    body: compactObject(input),
    method: "POST",
  });
}

export async function updateAppointment(
  accessToken: string,
  appointmentId: string,
  input: AppointmentUpdateInput,
): Promise<Appointment> {
  return request(`/reception/appointments/${appointmentId}`, accessToken, {
    body: compactObject(input),
    method: "PATCH",
  });
}

export async function cancelAppointment(
  accessToken: string,
  appointmentId: string,
  input: AppointmentCancelInput = {},
): Promise<Appointment> {
  return request(`/reception/appointments/${appointmentId}/cancel`, accessToken, {
    body: compactObject(input),
    method: "POST",
  });
}

function toQuery(filters: AppointmentListFilters): string {
  const query = new URLSearchParams();

  if (filters.date) {
    query.set("date", filters.date);
  }

  if (filters.weekOf) {
    query.set("weekOf", filters.weekOf);
  }

  return `?${query.toString()}`;
}

function compactObject<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() || null : value,
    ]),
  ) as T;
}

async function request<T>(
  path: string,
  accessToken: string,
  options: { body?: unknown; method?: string } = {},
): Promise<T> {
  const init: RequestInit = {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
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

  if (status === 400) {
    return "Confira os dados do agendamento.";
  }

  if (apiMessage && !/token|password|secret|stack|prisma|database/i.test(apiMessage)) {
    return apiMessage;
  }

  return "Nao foi possivel sincronizar a agenda. Confira a API e tente atualizar a lista.";
}
