// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

const originalFetch = globalThis.fetch;
const originalCreateObjectUrl = window.URL.createObjectURL;
const originalOpen = window.open;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-07-28T12:00:00.000Z"));
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
  window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/orcamento-pdf");
  window.URL.revokeObjectURL = vi.fn();
  window.open = vi.fn();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.URL.createObjectURL = originalCreateObjectUrl;
  window.open = originalOpen;
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("JO.IA quote UI", () => {
  it("QTE-01 exposes Orcamentos navigation only for quotes.read sessions", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload(["tenant.settings.read"]) ),
      ...adminRoutes(),
    ]);

    render(<App />);
    await login();

    expect(screen.queryByRole("button", { name: "Orcamentos" })).not.toBeInTheDocument();
    assertNoAutomaticCommunicationLanguage();
  });

  it("QTE-01 through QTE-11 manages check-in and direct quote creation, draft editing and publishing", async () => {
    const createAssert = vi.fn(({ init }: { init: RequestInit | undefined }) => {
      expect(JSON.parse(init?.body as string)).toMatchObject({
        checkInId: "check-in-1",
        customerId: "customer-1",
        vehicleId: "vehicle-1",
      });
    });
    const updateAssert = vi.fn(({ init }: { init: RequestInit | undefined }) => {
      const body = JSON.parse(init?.body as string);
      expect(body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "service", serviceCatalogEntryId: "service-1" }),
          expect.objectContaining({ kind: "product", productId: "product-1" }),
        ]),
      );
      expect(body.quoteDiscountAmount).toBe("80.00");
    });

    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      ...stockReadRoutes(),
      route("GET", "/reception/appointments?weekOf=2026-07-27", { data: [] }),
      route("GET", "/quotes", { data: [draftQuote] }),
      route("GET", "/reception/check-ins", { data: [checkIn] }),
      route("POST", "/quotes", { data: draftQuote }, 201, createAssert),
      route("PATCH", "/quotes/quote-1", { data: warningDraftQuote }, 200, updateAssert),
      route("GET", "/quotes", { data: [warningDraftQuote] }),
      route("POST", "/quotes/quote-1/publish", { data: publishedVersion }),
      route("GET", "/quotes", { data: [publishedQuote] }),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Orcamentos" }));

    expect(await screen.findByRole("button", { name: "Criar orcamento" })).toBeInTheDocument();
    expect(screen.getByText("Publique a versao para copiar o link seguro ou gerar PDF.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar link" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Imprimir/Gerar PDF" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Criar orcamento" }));
    const form = await screen.findByRole("form", { name: "Orcamento" });
    expect(within(form).getByLabelText("Origem do orcamento")).toHaveTextContent("Check-in");
    expect(within(form).getByLabelText("Origem do orcamento")).toHaveTextContent("Direto");
    fireEvent.change(within(form).getByLabelText("Check-in de origem"), {
      target: { value: "check-in-1" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Criar orcamento" }));
    expect(createAssert).toHaveBeenCalledTimes(1);

    const workspace = await screen.findByRole("region", { name: "Detalhe do orcamento" });
    expect(workspace).toHaveTextContent("Servicos");
    expect(workspace).toHaveTextContent("Produtos/pecas");
    expect(workspace).toHaveTextContent("Subtotal");
    expect(workspace).toHaveTextContent("Descontos dos itens");
    expect(workspace).toHaveTextContent("Acrescimos dos itens");
    expect(workspace).toHaveTextContent("Desconto do orcamento");
    expect(workspace).toHaveTextContent("Acrescimo do orcamento");
    expect(workspace).toHaveTextContent("Total final");
    expect(workspace).toHaveTextContent("R$");

    fireEvent.change(within(workspace).getByLabelText("Problema"), {
      target: { value: "Barulho ao frear" },
    });
    fireEvent.change(within(workspace).getByLabelText("Causa"), {
      target: { value: "Pastilha gasta" },
    });
    fireEvent.change(within(workspace).getByLabelText("Recomendacao"), {
      target: { value: "Trocar pastilhas e filtro" },
    });
    fireEvent.change(within(workspace).getByLabelText("Servico"), {
      target: { value: "service-1" },
    });
    fireEvent.click(within(workspace).getByRole("button", { name: "Adicionar servico" }));
    fireEvent.change(within(workspace).getByLabelText("Produto/peca"), {
      target: { value: "product-1" },
    });
    fireEvent.click(within(workspace).getByRole("button", { name: "Adicionar produto" }));
    fireEvent.change(within(workspace).getByLabelText("Desconto do orcamento"), {
      target: { value: "80.00" },
    });
    fireEvent.click(within(workspace).getByRole("button", { name: "Salvar rascunho" }));

    expect(
      await screen.findByText(
        "Desconto acima do limite configurado. O sistema permite continuar, mas registra o alerta para auditoria.",
      ),
    ).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: "Publicar versao" })).toBeEnabled();
    expect(within(workspace).getByRole("button", { name: "Salvar rascunho" })).toBeEnabled();

    fireEvent.change(within(workspace).getByLabelText("Validade da proposta"), {
      target: { value: "2026-08-15" },
    });
    fireEvent.click(within(workspace).getByRole("button", { name: "Publicar versao" }));

    expect(await screen.findByText("Versao publicada: valores comerciais ficam bloqueados. Crie nova versao para alterar itens ou totais.")).toBeInTheDocument();
    assertNoAutomaticCommunicationLanguage();
  });

  it("QTE-08/QTE-11 exposes published-only manual link, PDF, new-version and sent actions", async () => {
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");

    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      ...stockReadRoutes(),
      route("GET", "/reception/appointments?weekOf=2026-07-27", { data: [] }),
      route("GET", "/quotes", { data: [publishedQuote] }),
      route("POST", "/quotes/quote-1/versions/version-1/link", {
        data: {
          approvalUrl: "http://localhost:3001/quote-approval/token-publico",
          expiresAt: "2026-08-15T00:00:00.000Z",
          quoteVersionId: "version-1",
        },
      }),
      route("GET", "/quotes/quote-1/versions/version-1/pdf", new Blob(["pdf"]), 200),
      route("POST", "/quotes/quote-1/mark-sent", { data: { ...publishedVersion, status: "Enviado" } }),
      route("GET", "/quotes", { data: [{ ...publishedQuote, status: "Enviado" }] }),
      route("POST", "/quotes/quote-1/new-version", { data: draftQuote }),
      route("GET", "/quotes", { data: [draftQuote] }),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Orcamentos" }));

    const workspace = await screen.findByRole("region", { name: "Detalhe do orcamento" });
    expect(workspace).toHaveTextContent("Entrega manual fora do sistema. JO.IA nao envia mensagens automaticamente.");
    expect(within(workspace).getByLabelText("Problema")).toBeDisabled();
    expect(within(workspace).getByLabelText("Desconto do orcamento")).toBeDisabled();
    expect(within(workspace).getByRole("button", { name: "Criar nova versao" })).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: "Copiar link" })).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: "Imprimir/Gerar PDF" })).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: "Marcar como enviado" })).toBeInTheDocument();

    fireEvent.click(within(workspace).getByRole("button", { name: "Copiar link" }));
    expect(await screen.findByText("Link copiado para entrega manual.")).toBeInTheDocument();
    expect(clipboardSpy).toHaveBeenCalledWith("http://localhost:3001/quote-approval/token-publico");

    fireEvent.click(within(workspace).getByRole("button", { name: "Imprimir/Gerar PDF" }));
    expect(window.open).toHaveBeenCalledWith("blob:http://localhost/orcamento-pdf", "_blank", "noopener");

    fireEvent.click(within(workspace).getByRole("button", { name: "Marcar como enviado" }));
    expect(await screen.findByText("Orcamento marcado como enviado manualmente.")).toBeInTheDocument();

    fireEvent.click(within(workspace).getByRole("button", { name: "Criar nova versao" }));
    expect(await screen.findByText("Nova versao em rascunho criada a partir da publicada.")).toBeInTheDocument();
    assertNoAutomaticCommunicationLanguage();
  });

  it("renders backend 403 as the authoritative quote blocked state", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      ...stockReadRoutes(),
      route("GET", "/reception/appointments?weekOf=2026-07-27", { data: [] }),
      route("GET", "/quotes", { error: { message: "Forbidden" } }, 403),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Orcamentos" }));

    expect(
      await screen.findByText("Acesso bloqueado pela permissao do servidor."),
    ).toBeInTheDocument();
    assertNoAutomaticCommunicationLanguage();
  });
});

async function login() {
  fireEvent.change(await screen.findByLabelText("Email"), {
    target: { value: "admin@joia.local" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByRole("heading", { name: "Administracao" });
}

function assertNoAutomaticCommunicationLanguage() {
  const text = document.body.textContent ?? "";
  expect(text).not.toMatch(/whatsapp|sms|notificacao|campanha|disparo|entregue|lido|leitura/i);
  expect(document.body.innerHTML).not.toMatch(/wa\.me|mailto:|sms:/i);
}

function createFetchMock(routes: MockRoute[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const parsedUrl = new URL(url);
    const path = `${parsedUrl.pathname}${parsedUrl.search}`;
    const matchingIndexes = routes
      .map((item, index) => ({ index, item }))
      .filter(({ item }) => item.method === method && item.path === path)
      .map(({ index }) => index);
    const foundIndex = matchingIndexes[0] ?? -1;
    const found =
      foundIndex >= 0 && matchingIndexes.length > 1
        ? routes.splice(foundIndex, 1)[0]
        : routes[foundIndex];

    if (!found) {
      throw new Error(`Unexpected fetch ${method} ${path}`);
    }

    found.assert?.({ init, input, path });

    if (found.body instanceof Blob) {
      return blobResponse(found.body, found.status);
    }

    return jsonResponse(found.body, found.status);
  });
}

function route(
  method: string,
  path: string,
  body: unknown,
  status = 200,
  assert?: MockRoute["assert"],
): MockRoute {
  return { assert, body, method, path, status };
}

type MockRoute = {
  assert?:
    | ((request: { init: RequestInit | undefined; input: RequestInfo | URL; path: string }) => void)
    | undefined;
  body: unknown;
  method: string;
  path: string;
  status: number;
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function blobResponse(body: Blob, status = 200): Response {
  return {
    blob: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function adminRoutes() {
  return [
    route("GET", "/tenant-settings", { data: tenantSettings }),
    route("GET", "/users", { data: users }),
    route("GET", "/roles", { data: roles }),
    route("GET", "/permissions", { data: permissionCatalog }),
  ];
}

function customerVehicleRoutes() {
  return [
    route("GET", "/customers", { data: customers }),
    route("GET", "/vehicles", { data: vehicles }),
  ];
}

function stockReadRoutes() {
  return [
    route("GET", "/stock/services", { data: services }),
    route("GET", "/stock/categories", { data: [] }),
    route("GET", "/stock/products", { data: products }),
    route("GET", "/stock/suppliers", { data: [] }),
    route("GET", "/stock/movements", { data: [] }),
    route("GET", "/stock/reservations", { data: [] }),
  ];
}

const allPermissions = [
  "tenant.settings.read",
  "users.read",
  "roles.manage",
  "permissions.manage",
  "customers.read",
  "vehicles.read",
  "stock.catalog.read",
  "stock.movements.read",
  "reception.appointments.read",
  "reception.checkins.read",
  "quotes.read",
  "quotes.write",
  "quotes.publish",
  "quotes.pdf",
  "quotes.link",
  "quotes.status",
];

const tenantSettings = {
  agendaViewMode: "table",
  currencyCode: "BRL",
  document: "00.000.000/0001-00",
  id: "settings-1",
  legalName: "Oficina Joia LTDA",
  locale: "pt-BR",
  tenantId: "tenant-1",
  timezone: "America/Sao_Paulo",
  tradeName: "Oficina Joia",
  updatedAt: "2026-07-28T12:00:00.000Z",
};

const users = [
  {
    createdAt: "2026-07-28T12:00:00.000Z",
    deactivatedAt: null,
    email: "admin@joia.local",
    id: "admin-1",
    name: "Admin Joia",
    permissionOverrides: [],
    roles: [{ id: "role-1", key: "admin", name: "Administrador" }],
    status: "active",
    tenantId: "tenant-1",
    updatedAt: "2026-07-28T12:00:00.000Z",
  },
];

const roles = [
  {
    createdAt: "2026-07-28T12:00:00.000Z",
    description: "Acesso administrativo completo",
    id: "role-1",
    isSystem: true,
    key: "admin",
    name: "Administrador",
    permissions: allPermissions,
    tenantId: "tenant-1",
    updatedAt: "2026-07-28T12:00:00.000Z",
  },
];

const permissionCatalog = allPermissions.map((key) => ({
  description: `Permissao ${key}`,
  key,
  name: key,
}));

const customers = [
  {
    createdAt: "2026-07-20T12:00:00.000Z",
    deletedAt: null,
    document: "123.456.789-01",
    documentNormalized: "12345678901",
    documentType: "cpf",
    email: "maria@example.test",
    id: "customer-1",
    name: "Maria Oliveira",
    notes: null,
    phone: "(11) 99999-0000",
    phoneNormalized: "11999990000",
    tenantId: "tenant-1",
    updatedAt: "2026-07-20T12:00:00.000Z",
  },
];

const vehicles = [
  {
    brand: "Toyota",
    color: "Branco",
    createdAt: "2026-07-20T12:00:00.000Z",
    customer: { id: "customer-1", name: "Maria Oliveira" },
    customerId: "customer-1",
    deletedAt: null,
    id: "vehicle-1",
    mileage: 45000,
    model: "Corolla",
    notes: null,
    plate: "ABC1D23",
    plateNormalized: "ABC1D23",
    tenantId: "tenant-1",
    updatedAt: "2026-07-20T12:00:00.000Z",
    vin: "9BWZZZ377VT004251",
    vinNormalized: "9BWZZZ377VT004251",
    year: 2022,
  },
];

const services = [
  {
    basePrice: "180.00",
    createdAt: "2026-07-22T12:00:00.000Z",
    deactivatedAt: null,
    description: "Troca completa",
    id: "service-1",
    name: "Troca de oleo",
    tenantId: "tenant-1",
    updatedAt: "2026-07-22T12:00:00.000Z",
  },
];

const products = [
  {
    availableQuantity: 4,
    category: null,
    categoryId: "category-1",
    costPrice: "35.00",
    createdAt: "2026-07-22T12:00:00.000Z",
    deactivatedAt: null,
    description: "Filtro motor",
    id: "product-1",
    lowStock: false,
    minimumStock: 2,
    name: "Filtro de oleo",
    physicalQuantity: 6,
    reservedQuantity: 2,
    salePrice: "59.90",
    sku: "FIL-001",
    tenantId: "tenant-1",
    updatedAt: "2026-07-22T12:00:00.000Z",
  },
];

const checkIn = {
  appointment: {
    expectedService: "Recepcao para diagnostico",
    id: "appointment-1",
    origin: "Balcao",
    startsAt: "2026-07-28T11:00:00.000Z",
    status: "Convertido",
  },
  appointmentId: "appointment-1",
  checklistItems: [],
  createdAt: "2026-07-28T11:30:00.000Z",
  createdByUserId: "admin-1",
  customer: { id: "customer-1", name: "Maria Oliveira" },
  customerId: "customer-1",
  damageNotes: "Barulho ao frear",
  enteredAt: "2026-07-28T11:30:00.000Z",
  fuelLevel: "1/2",
  id: "check-in-1",
  itemsLeft: null,
  mileage: 45120,
  status: "Aguardando diagnostico",
  tenantId: "tenant-1",
  updatedAt: "2026-07-28T11:30:00.000Z",
  updatedByUserId: null,
  vehicle: { id: "vehicle-1", plateNormalized: "ABC1D23" },
  vehicleId: "vehicle-1",
};

const draftQuote = quoteFixture({
  currentVersionId: null,
  discountWarning: { message: null, percent: "10.00", triggered: false },
  status: "Rascunho",
});

const warningDraftQuote = quoteFixture({
  discountWarning: {
    message:
      "Desconto acima do limite configurado. O sistema permite continuar, mas registra o alerta para auditoria.",
    percent: "10.00",
    triggered: true,
  },
  items: [
    {
      description: "Troca de oleo",
      discountAmount: "0.00",
      id: "item-1",
      kind: "service",
      productId: null,
      quantity: "1.000",
      serviceCatalogEntryId: "service-1",
      sortOrder: 1,
      surchargeAmount: "0.00",
      totalAmount: "180.00",
      unitPrice: "180.00",
    },
    {
      description: "Filtro de oleo",
      discountAmount: "0.00",
      id: "item-2",
      kind: "product",
      productId: "product-1",
      quantity: "1.000",
      serviceCatalogEntryId: null,
      sortOrder: 2,
      surchargeAmount: "0.00",
      totalAmount: "59.90",
      unitPrice: "59.90",
    },
  ],
  totals: {
    discountAmount: "80.00",
    subtotalAmount: "239.90",
    surchargeAmount: "0.00",
    totalAmount: "159.90",
  },
  validUntil: "2026-08-15T00:00:00.000Z",
});

const publishedQuote = quoteFixture({
  currentVersionId: "version-1",
  discountWarning: warningDraftQuote.discountWarning,
  items: warningDraftQuote.items,
  status: "Publicado",
  totals: warningDraftQuote.totals,
  validUntil: "2026-08-15T00:00:00.000Z",
});

const publishedVersion = {
  checkInId: "check-in-1",
  customer: {
    document: "123.456.789-01",
    email: "maria@example.test",
    name: "Maria Oliveira",
    phone: "(11) 99999-0000",
  },
  customerId: "customer-1",
  customerNotes: null,
  diagnosis: {
    causa: "Pastilha gasta",
    problema: "Barulho ao frear",
    recomendacao: "Trocar pastilhas e filtro",
  },
  discountWarning: warningDraftQuote.discountWarning,
  estimatedDeliveryAt: null,
  id: "version-1",
  items: warningDraftQuote.items,
  publishedAt: "2026-07-28T12:30:00.000Z",
  quoteId: "quote-1",
  sourceKind: "check_in",
  status: "Publicado",
  tenantId: "tenant-1",
  totals: warningDraftQuote.totals,
  validUntil: "2026-08-15T00:00:00.000Z",
  vehicle: {
    brand: "Toyota",
    label: "Toyota Corolla",
    model: "Corolla",
    plate: "ABC1D23",
    year: 2022,
  },
  vehicleId: "vehicle-1",
  versionNumber: 1,
  workshop: {
    document: "00.000.000/0001-00",
    legalName: "Oficina Joia LTDA",
    tradeName: "Oficina Joia",
  },
};

function quoteFixture(overrides: Record<string, unknown> = {}) {
  return {
    checkInId: "check-in-1",
    createdAt: "2026-07-28T12:00:00.000Z",
    createdByUserId: "admin-1",
    currentVersionId: null,
    customer: customers[0],
    customerId: "customer-1",
    customerNotes: null,
    diagnosis: {
      causa: "Pastilha gasta",
      problema: "Barulho ao frear",
      recomendacao: "Trocar pastilhas e filtro",
    },
    discountWarning: { message: null, percent: "10.00", triggered: false },
    estimatedDeliveryAt: null,
    id: "quote-1",
    internalNotes: "Nao expor margem",
    items: [],
    publishReadiness: { canPublish: true, missing: [] },
    sourceKind: "check_in",
    status: "Rascunho",
    tenantId: "tenant-1",
    totals: {
      discountAmount: "0.00",
      subtotalAmount: "0.00",
      surchargeAmount: "0.00",
      totalAmount: "0.00",
    },
    updatedAt: "2026-07-28T12:00:00.000Z",
    updatedByUserId: null,
    validUntil: null,
    vehicle: vehicles[0],
    vehicleId: "vehicle-1",
    ...overrides,
  };
}

function sessionPayload(permissions = allPermissions) {
  return {
    data: {
      accessToken: "access-token-1",
      refreshToken: "refresh-token-1",
      sessionId: "session-1",
      tenantId: "tenant-1",
      user: {
        email: "admin@joia.local",
        id: "admin-1",
        name: "Admin Joia",
        permissions,
        status: "active",
        tenantId: "tenant-1",
      },
    },
  };
}
