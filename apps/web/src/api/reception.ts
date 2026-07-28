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

export type CheckInStatus = "Aguardando diagnostico";

export type AttachmentCategory = "Avaria" | "Documento" | "Painel" | "Motor" | "Interior" | "Outro";

export type CheckInAttachment = {
  category: AttachmentCategory;
  checkInId: string;
  createdAt: string;
  deletedAt: string | null;
  id: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storedName: string;
  tenantId: string;
  uploadedByUserId: string | null;
};

export type CheckInChecklistItem = {
  condition: string;
  id?: string;
  label: string;
  notes?: string | null;
};

export type CheckIn = {
  appointment: {
    expectedService: string;
    id: string;
    origin: string;
    startsAt: string;
    status: AppointmentStatus;
  };
  appointmentId: string;
  checklistItems: CheckInChecklistItem[];
  createdAt: string;
  createdByUserId: string | null;
  customer: { id: string; name: string };
  customerId: string;
  damageNotes: string;
  enteredAt: string;
  fuelLevel: string;
  id: string;
  itemsLeft: string | null;
  mileage: number | null;
  status: CheckInStatus;
  tenantId: string;
  updatedAt: string;
  updatedByUserId: string | null;
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

export type CheckInListFilters = {
  customerId?: string;
  date?: string;
  vehicleId?: string;
};

export type CheckInInput = {
  appointmentId?: string;
  checklistItems: CheckInChecklistItem[];
  customerId: string;
  damageNotes: string;
  enteredAt: string;
  expectedService?: string;
  fuelLevel: string;
  itemsLeft?: string | null;
  mileage?: number | null;
  vehicleId: string;
};

export type CheckInUpdateInput = Partial<
  Pick<CheckInInput, "checklistItems" | "damageNotes" | "enteredAt" | "fuelLevel" | "itemsLeft" | "mileage">
>;

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

export async function listCheckIns(
  accessToken: string,
  filters: CheckInListFilters = {},
): Promise<CheckIn[]> {
  return request(`/reception/check-ins${toOptionalQuery(filters)}`, accessToken);
}

export async function getCheckIn(accessToken: string, checkInId: string): Promise<CheckIn> {
  return request(`/reception/check-ins/${checkInId}`, accessToken);
}

export async function createCheckIn(
  accessToken: string,
  input: CheckInInput,
): Promise<CheckIn> {
  return request("/reception/check-ins", accessToken, {
    body: compactObject(input),
    method: "POST",
  });
}

export async function updateCheckIn(
  accessToken: string,
  checkInId: string,
  input: CheckInUpdateInput,
): Promise<CheckIn> {
  return request(`/reception/check-ins/${checkInId}`, accessToken, {
    body: compactObject(input),
    method: "PATCH",
  });
}

export async function listCheckInAttachments(
  accessToken: string,
  checkInId: string,
): Promise<CheckInAttachment[]> {
  return request(`/reception/check-ins/${checkInId}/attachments`, accessToken);
}

export async function uploadCheckInAttachment(
  accessToken: string,
  checkInId: string,
  input: { category: AttachmentCategory; file: File },
): Promise<CheckInAttachment> {
  const body = new FormData();
  body.append("category", input.category);
  body.append("file", input.file);

  return request(`/reception/check-ins/${checkInId}/attachments`, accessToken, {
    body,
    method: "POST",
  });
}

export async function downloadCheckInAttachment(
  accessToken: string,
  checkInId: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/reception/check-ins/${checkInId}/attachments/${attachmentId}/download`,
    {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    const body = (await readErrorBody(response)) as { error?: { message?: string } } | null;
    throw new ApiError(response.status, toErrorMessage(response.status, body?.error?.message));
  }

  return response.blob();
}

export async function deleteCheckInAttachment(
  accessToken: string,
  checkInId: string,
  attachmentId: string,
): Promise<void> {
  return request(`/reception/check-ins/${checkInId}/attachments/${attachmentId}`, accessToken, {
    method: "DELETE",
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

function toOptionalQuery(filters: CheckInListFilters): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      query.set(key, value);
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
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
  options: { body?: FormData | unknown; method?: string } = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const init: RequestInit = {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      ...(options.body === undefined || isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${accessToken}`,
    },
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    init.body = isFormData ? (options.body as BodyInit) : JSON.stringify(options.body);
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

  if (status === 404) {
    return "Anexo nao encontrado pelo servidor.";
  }

  if (status === 400) {
    return "Confira os dados do agendamento.";
  }

  if (apiMessage && !/token|password|secret|stack|prisma|database/i.test(apiMessage)) {
    return apiMessage;
  }

  return "Nao foi possivel sincronizar a agenda. Confira a API e tente atualizar a lista.";
}
