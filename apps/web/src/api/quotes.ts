import { ApiError } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  data: T;
};

export type QuoteStatus = "Cancelado" | "Enviado" | "Expirado" | "Publicado" | "Rascunho";
export type QuoteSourceKind = "check_in" | "direct";
export type QuoteItemKind = "product" | "service";

export type QuoteItem = {
  description: string | null;
  discountAmount: string;
  id: string;
  kind: QuoteItemKind;
  productId: string | null;
  quantity: string;
  serviceCatalogEntryId: string | null;
  sortOrder: number;
  surchargeAmount: string;
  totalAmount: string;
  unitPrice: string;
};

export type QuoteTotals = {
  discountAmount: string;
  subtotalAmount: string;
  surchargeAmount: string;
  totalAmount: string;
};

export type QuoteDiagnosis = {
  causa: string | null;
  problema: string | null;
  recomendacao: string | null;
};

export type Quote = {
  checkInId: string | null;
  createdAt: string;
  createdByUserId: string | null;
  currentVersionId?: string | null;
  customer: { id: string; name: string };
  customerId: string;
  customerNotes: string | null;
  diagnosis: QuoteDiagnosis;
  discountWarning: {
    message: string | null;
    percent: string;
    triggered: boolean;
  };
  estimatedDeliveryAt: string | null;
  id: string;
  internalNotes: string | null;
  items: QuoteItem[];
  publishReadiness: {
    canPublish: boolean;
    missing: string[];
  };
  sourceKind: QuoteSourceKind;
  status: QuoteStatus;
  tenantId: string;
  totals: QuoteTotals;
  updatedAt: string;
  updatedByUserId: string | null;
  validUntil: string | null;
  vehicle: {
    brand?: string | null;
    id: string;
    model?: string | null;
    plateNormalized?: string | null;
    year?: number | null;
  };
  vehicleId: string;
};

export type QuoteVersion = {
  checkInId: string | null;
  customer: {
    document: string | null;
    email: string | null;
    name: string;
    phone: string | null;
  };
  customerId: string;
  customerNotes: string | null;
  diagnosis: QuoteDiagnosis;
  discountWarning: Quote["discountWarning"];
  estimatedDeliveryAt: string | null;
  id: string;
  items: QuoteItem[];
  publishedAt: string;
  quoteId: string;
  sourceKind: QuoteSourceKind;
  status: QuoteStatus;
  tenantId: string;
  totals: QuoteTotals;
  validUntil: string;
  vehicle: {
    brand: string | null;
    label: string;
    model: string | null;
    plate: string | null;
    year: number | null;
  };
  vehicleId: string;
  versionNumber: number;
  workshop: {
    document: string | null;
    legalName: string | null;
    tradeName: string;
  };
};

export type QuoteApprovalLink = {
  approvalUrl: string;
  expiresAt: string | null;
  quoteVersionId: string;
};

export type QuoteItemInput = {
  description?: string | null;
  discountAmount?: string | null;
  kind: QuoteItemKind;
  productId?: string;
  quantity: string;
  serviceCatalogEntryId?: string;
  surchargeAmount?: string | null;
  unitPrice?: string;
};

export type QuoteInput = {
  checkInId?: string;
  customerId: string;
  customerNotes?: string | null;
  diagnosis?: Partial<QuoteDiagnosis> | null;
  estimatedDeliveryAt?: string | null;
  internalNotes?: string | null;
  items?: QuoteItemInput[];
  quoteDiscountAmount?: string | null;
  quoteSurchargeAmount?: string | null;
  validUntil?: string | null;
  vehicleId: string;
};

export type QuoteUpdateInput = Omit<Partial<QuoteInput>, "checkInId" | "customerId" | "vehicleId">;

export type QuoteFilters = {
  customerId?: string;
  status?: QuoteStatus;
  vehicleId?: string;
};

export async function listQuotes(
  accessToken: string,
  filters: QuoteFilters = {},
): Promise<Quote[]> {
  return request(`/quotes${toQuery(filters)}`, accessToken);
}

export async function getQuote(accessToken: string, quoteId: string): Promise<Quote> {
  return request(`/quotes/${quoteId}`, accessToken);
}

export async function createQuote(accessToken: string, input: QuoteInput): Promise<Quote> {
  return request("/quotes", accessToken, { body: compactObject(input), method: "POST" });
}

export async function updateQuoteDraft(
  accessToken: string,
  quoteId: string,
  input: QuoteUpdateInput,
): Promise<Quote> {
  return request(`/quotes/${quoteId}`, accessToken, {
    body: compactObject(input),
    method: "PATCH",
  });
}

export async function publishQuoteVersion(
  accessToken: string,
  quoteId: string,
): Promise<QuoteVersion> {
  return request(`/quotes/${quoteId}/publish`, accessToken, { method: "POST" });
}

export async function createNewQuoteVersion(accessToken: string, quoteId: string): Promise<Quote> {
  return request(`/quotes/${quoteId}/new-version`, accessToken, { method: "POST" });
}

export async function getQuoteVersion(
  accessToken: string,
  quoteId: string,
  versionId: string,
): Promise<QuoteVersion> {
  return request(`/quotes/${quoteId}/versions/${versionId}`, accessToken);
}

export async function createQuoteApprovalLink(
  accessToken: string,
  quoteId: string,
  versionId: string,
  input: { expiresAt?: string | null } = {},
): Promise<QuoteApprovalLink> {
  return request(`/quotes/${quoteId}/versions/${versionId}/link`, accessToken, {
    body: compactObject(input),
    method: "POST",
  });
}

export async function fetchQuotePdf(
  accessToken: string,
  quoteId: string,
  versionId: string,
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/versions/${versionId}/pdf`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    const body = (await readErrorBody(response)) as { error?: { message?: string } } | null;
    throw new ApiError(response.status, toErrorMessage(response.status, body?.error?.message));
  }

  return response.blob();
}

export async function markQuoteSent(accessToken: string, quoteId: string): Promise<QuoteVersion> {
  return request(`/quotes/${quoteId}/mark-sent`, accessToken, { method: "POST" });
}

export async function cancelQuote(accessToken: string, quoteId: string): Promise<QuoteVersion> {
  return request(`/quotes/${quoteId}/cancel`, accessToken, { method: "POST" });
}

function toQuery(filters: QuoteFilters): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      query.set(key, value);
    }
  }

  return query.size ? `?${query.toString()}` : "";
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
    return "Confira os dados do orcamento.";
  }

  if (status === 409 && apiMessage?.includes("published")) {
    return "Publique o orcamento antes de usar esta acao.";
  }

  if (apiMessage && !/token|password|secret|stack|prisma|database/i.test(apiMessage)) {
    return apiMessage;
  }

  return "Nao foi possivel sincronizar orcamentos. Confira a API e tente atualizar a lista.";
}
