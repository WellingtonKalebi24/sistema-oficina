import { ApiError } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  data: T;
};

export type StockFilters = {
  productId?: string;
  search?: string;
  sourceKind?: string;
  status?: "active" | "cancelled";
  type?: string;
};

export type ServiceCatalogEntry = {
  basePrice: string;
  createdAt: string;
  deactivatedAt: string | null;
  description: string | null;
  id: string;
  name: string;
  tenantId: string;
  updatedAt: string;
};

export type ProductCategory = {
  createdAt: string;
  deactivatedAt: string | null;
  description: string | null;
  id: string;
  name: string;
  tenantId: string;
  updatedAt: string;
};

export type Product = {
  availableQuantity: number;
  category: { id: string; name: string } | null;
  categoryId: string;
  costPrice: string | null;
  createdAt: string;
  deactivatedAt: string | null;
  description: string | null;
  id: string;
  lowStock: boolean;
  minimumStock: number;
  name: string;
  physicalQuantity: number;
  reservedQuantity: number;
  salePrice: string | null;
  sku: string | null;
  tenantId: string;
  updatedAt: string;
};

export type Supplier = {
  createdAt: string;
  deactivatedAt: string | null;
  document: string | null;
  documentNormalized: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  tenantId: string;
  updatedAt: string;
};

export type Purchase = {
  createdAt: string;
  documentNumber: string | null;
  id: string;
  itemCount: number;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    stockMovementId: string | null;
    totalCost: string;
    unitCost: string;
  }>;
  purchasedAt: string;
  supplierId: string;
  tenantId: string;
  totalAmount: string;
  updatedAt: string;
};

export type StockMovement = {
  balanceAfterAvailable: number;
  balanceAfterPhysical: number;
  balanceAfterReserved: number;
  createdAt: string;
  id: string;
  productId: string;
  quantityDelta: number;
  sourceId: string | null;
  sourceKind: string;
  sourceLabel: string | null;
  tenantId: string;
  type: string;
};

export type StockReservation = {
  cancelledAt: string | null;
  createdAt: string;
  id: string;
  productId: string;
  quantity: number;
  sourceId: string | null;
  sourceKind: string;
  sourceLabel: string | null;
  sourceReference: string | null;
  status: "active" | "cancelled";
  tenantId: string;
  updatedAt: string;
};

export type ServiceCatalogEntryInput = {
  basePrice: string;
  description?: string | null;
  name: string;
};

export type ProductCategoryInput = {
  description?: string | null;
  name: string;
};

export type ProductInput = {
  categoryId: string;
  costPrice?: string | null;
  description?: string | null;
  minimumStock?: number | null;
  name: string;
  salePrice?: string | null;
  sku?: string | null;
};

export type SupplierInput = {
  document?: string | null;
  name: string;
  notes?: string | null;
  phone?: string | null;
};

export type PurchaseInput = {
  documentNumber?: string | null;
  items: Array<{ productId: string; quantity: number; unitCost: string }>;
  purchasedAt: string;
  supplierId: string;
};

export type StockExitInput = {
  origin: string;
  productId: string;
  quantity: number;
  sourceKind: string;
  sourceLabel?: string | null;
};

export type StockAdjustmentInput = {
  productId: string;
  quantityDelta: number;
  reason: string;
  sourceKind: string;
  sourceLabel?: string | null;
};

export type StockReservationInput = {
  productId: string;
  quantity: number;
  sourceId?: string | null;
  sourceKind: string;
  sourceLabel?: string | null;
  sourceReference?: string | null;
};

export async function listServices(
  accessToken: string,
  filters: StockFilters = {},
): Promise<ServiceCatalogEntry[]> {
  return request(`/stock/services${toQuery(filters)}`, accessToken);
}

export async function createService(
  accessToken: string,
  input: ServiceCatalogEntryInput,
): Promise<ServiceCatalogEntry> {
  return request("/stock/services", accessToken, { body: compactObject(input), method: "POST" });
}

export async function deactivateService(accessToken: string, serviceId: string): Promise<void> {
  await request<void>(`/stock/services/${serviceId}`, accessToken, { method: "DELETE" });
}

export async function listCategories(
  accessToken: string,
  filters: StockFilters = {},
): Promise<ProductCategory[]> {
  return request(`/stock/categories${toQuery(filters)}`, accessToken);
}

export async function createCategory(
  accessToken: string,
  input: ProductCategoryInput,
): Promise<ProductCategory> {
  return request("/stock/categories", accessToken, { body: compactObject(input), method: "POST" });
}

export async function listProducts(
  accessToken: string,
  filters: StockFilters = {},
): Promise<Product[]> {
  return request(`/stock/products${toQuery(filters)}`, accessToken);
}

export async function createProduct(accessToken: string, input: ProductInput): Promise<Product> {
  return request("/stock/products", accessToken, { body: compactObject(input), method: "POST" });
}

export async function deactivateProduct(accessToken: string, productId: string): Promise<void> {
  await request<void>(`/stock/products/${productId}`, accessToken, { method: "DELETE" });
}

export async function listSuppliers(
  accessToken: string,
  filters: StockFilters = {},
): Promise<Supplier[]> {
  return request(`/stock/suppliers${toQuery(filters)}`, accessToken);
}

export async function createSupplier(accessToken: string, input: SupplierInput): Promise<Supplier> {
  return request("/stock/suppliers", accessToken, { body: compactObject(input), method: "POST" });
}

export async function deactivateSupplier(accessToken: string, supplierId: string): Promise<void> {
  await request<void>(`/stock/suppliers/${supplierId}`, accessToken, { method: "DELETE" });
}

export async function createPurchase(accessToken: string, input: PurchaseInput): Promise<Purchase> {
  return request("/stock/purchases", accessToken, { body: compactObject(input), method: "POST" });
}

export async function listMovements(
  accessToken: string,
  filters: StockFilters = {},
): Promise<StockMovement[]> {
  return request(`/stock/movements${toQuery(filters)}`, accessToken);
}

export async function createStockExit(
  accessToken: string,
  input: StockExitInput,
): Promise<StockMovement> {
  return request("/stock/exits", accessToken, { body: compactObject(input), method: "POST" });
}

export async function createStockAdjustment(
  accessToken: string,
  input: StockAdjustmentInput,
): Promise<StockMovement> {
  return request("/stock/adjustments", accessToken, {
    body: compactObject(input),
    method: "POST",
  });
}

export async function listReservations(
  accessToken: string,
  filters: StockFilters = {},
): Promise<StockReservation[]> {
  return request(`/stock/reservations${toQuery(filters)}`, accessToken);
}

export async function createReservation(
  accessToken: string,
  input: StockReservationInput,
): Promise<StockReservation> {
  return request("/stock/reservations", accessToken, {
    body: compactObject(input),
    method: "POST",
  });
}

export async function cancelReservation(
  accessToken: string,
  reservationId: string,
): Promise<StockReservation> {
  return request(`/stock/reservations/${reservationId}/cancel`, accessToken, { method: "POST" });
}

function toQuery(filters: StockFilters): string {
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

  if (status === 409 && apiMessage === "Insufficient available stock.") {
    return "Estoque disponivel insuficiente para esta operacao.";
  }

  if (apiMessage && !/token|password|secret|stack|prisma|database/i.test(apiMessage)) {
    return apiMessage;
  }

  return "Nao foi possivel sincronizar o estoque. Confira a API e tente atualizar a lista.";
}
