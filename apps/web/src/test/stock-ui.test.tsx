// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("JO.IA stock UI", () => {
  it("D-09 exposes Estoque work areas with required markers and stock quantities", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...stockReadRoutes(),
    ]);

    render(<App />);
    await login();

    fireEvent.click(screen.getByRole("button", { name: "Estoque" }));

    expect(await screen.findByRole("tab", { name: "Produtos" })).toBeInTheDocument();
    for (const tabName of [
      "Servicos",
      "Produtos",
      "Fornecedores",
      "Compras",
      "Movimentos",
      "Reservas",
      "Alertas",
    ]) {
      expect(screen.getByRole("tab", { name: tabName })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "Salvar produto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome do produto *")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria *")).toBeInTheDocument();
    const productForm = screen.getByLabelText("Cadastro de produto") as HTMLFormElement;
    const categoryForm = screen.getByLabelText("Cadastro de categoria") as HTMLFormElement;
    const categoryNameInput = screen.getByLabelText("Nome da categoria *");
    expect(productForm).not.toContainElement(categoryNameInput);
    expect(categoryForm).toContainElement(categoryNameInput);
    fireEvent.change(screen.getByLabelText("Nome do produto *"), {
      target: { value: "Oleo" },
    });
    expect(productForm.checkValidity()).toBe(true);
    expect(categoryForm.checkValidity()).toBe(false);
    expect(screen.getByRole("table", { name: "Produtos de estoque" })).toHaveTextContent(
      "SKU/Codigo",
    );
    expect(screen.getByRole("table", { name: "Produtos de estoque" })).toHaveTextContent(
      "Estoque fisico",
    );
    expect(screen.getByRole("table", { name: "Produtos de estoque" })).toHaveTextContent(
      "Reservado",
    );
    expect(screen.getByRole("table", { name: "Produtos de estoque" })).toHaveTextContent(
      "Disponivel",
    );
    expect(screen.getByRole("table", { name: "Produtos de estoque" })).toHaveTextContent(
      "Filtro de oleo",
    );
    expect(screen.getByText("Estoque baixo")).toBeInTheDocument();

    assertNoCommunicationLanguage();
  });

  it("D-03 renders server 403 as the authoritative stock blocked state", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      route("GET", "/stock/services", { error: { message: "Forbidden" } }, 403),
      route("GET", "/stock/categories", { error: { message: "Forbidden" } }, 403),
      route("GET", "/stock/products", { error: { message: "Forbidden" } }, 403),
      route("GET", "/stock/suppliers", { error: { message: "Forbidden" } }, 403),
      route("GET", "/stock/movements", { error: { message: "Forbidden" } }, 403),
      route("GET", "/stock/reservations", { error: { message: "Forbidden" } }, 403),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Estoque" }));

    expect(
      await screen.findByText("Acesso bloqueado pela permissao do servidor."),
    ).toBeInTheDocument();
    assertNoCommunicationLanguage();
  });

  it("D-07 submits purchase, movement and reservation actions without communication surfaces", async () => {
    const fetchMock = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...stockReadRoutes(),
      route("POST", "/stock/purchases", { data: purchase }, 201),
      ...stockReadRoutes({ product: productAfterPurchase, movement: entryMovement }),
      route("POST", "/stock/exits", { data: exitMovement }, 201),
      ...stockReadRoutes({ product: productAfterExit, movement: exitMovement }),
      route("POST", "/stock/adjustments", { data: adjustmentMovement }, 201),
      ...stockReadRoutes({ product: productAfterAdjustment, movement: adjustmentMovement }),
      route("POST", "/stock/reservations", { data: reservation }, 201),
      ...stockReadRoutes({ product: productAfterReservation, reservation }),
      route("POST", "/stock/reservations/reservation-1/cancel", { data: cancelledReservation }),
      ...stockReadRoutes({ product: productAfterCancel, reservation: cancelledReservation }),
    ]);
    globalThis.fetch = fetchMock;

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Estoque" }));

    await screen.findByRole("button", { name: "Salvar produto" });
    fireEvent.click(screen.getByRole("tab", { name: "Compras" }));
    fireEvent.change(screen.getByLabelText("Fornecedor da compra *"), {
      target: { value: "supplier-1" },
    });
    fireEvent.change(screen.getByLabelText("Produto comprado *"), {
      target: { value: "product-1" },
    });
    fireEvent.change(screen.getByLabelText("Quantidade comprada *"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Custo unitario *"), { target: { value: "35.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar compra" }));
    expect(
      await screen.findByText("Compra registrada e estoque atualizado pelo backend."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Movimentos" }));
    fireEvent.change(screen.getByLabelText("Produto da saida *"), {
      target: { value: "product-1" },
    });
    fireEvent.change(screen.getByLabelText("Quantidade de saida *"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Origem da saida *"), {
      target: { value: "Balcao" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar saida" }));
    expect(await screen.findByText("Saida registrada pelo backend.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Produto do ajuste *"), {
      target: { value: "product-1" },
    });
    fireEvent.change(screen.getByLabelText("Diferenca do ajuste *"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Motivo do ajuste *"), {
      target: { value: "Conferencia fisica" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));
    expect(await screen.findByText("Ajuste registrado pelo backend.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Reservas" }));
    fireEvent.change(screen.getByLabelText("Produto reservado *"), {
      target: { value: "product-1" },
    });
    fireEvent.change(screen.getByLabelText("Quantidade reservada *"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Referencia da origem *"), {
      target: { value: "OS futura" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reservar peca" }));
    expect(
      await screen.findByText("Reserva registrada sem alterar o saldo fisico."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva de Filtro de oleo" }));
    expect(
      screen.getByText(
        "Confirmar cancelamento da reserva de Filtro de oleo? A disponibilidade sera recalculada pelo backend.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento da reserva" }));
    expect(await screen.findByText("Reserva cancelada pelo backend.")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/stock/purchases",
      expect.objectContaining({ method: "POST" }),
    );
    assertNoCommunicationLanguage();
  });

  it("D-08 keeps vehicle registration permissive while stock UI adds required markers", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...stockReadRoutes(),
      route("GET", "/customers", { data: customers }),
      route("GET", "/vehicles", { data: vehicles }),
    ]);

    render(<App />);
    await login();

    fireEvent.click(screen.getByRole("button", { name: "Veiculos" }));
    await screen.findByLabelText("Cadastro de veiculo");

    expect(screen.getByLabelText("Cliente atual")).toBeRequired();
    expect(screen.getByLabelText("Placa")).not.toBeRequired();
    expect(screen.getByLabelText("Marca")).not.toBeRequired();
    expect(screen.getByLabelText("Modelo")).not.toBeRequired();
    expect(screen.getByLabelText("Chassi/VIN")).not.toBeRequired();
    expect(screen.getByText(/demais campos podem ser preenchidos depois/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Estoque" }));
    expect(await screen.findByLabelText("Nome do produto *")).toBeRequired();
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

function assertNoCommunicationLanguage() {
  const text = document.body.textContent ?? "";
  expect(text).not.toMatch(/whatsapp|sms|notificacao|campanha|disparo|entrega|leitura/i);
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

    return jsonResponse(found.body, found.status);
  });
}

function route(method: string, path: string, body: unknown, status = 200): MockRoute {
  return { body, method, path, status };
}

type MockRoute = {
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

function adminRoutes() {
  return [
    route("GET", "/tenant-settings", { data: tenantSettings }),
    route("GET", "/users", { data: users }),
    route("GET", "/roles", { data: roles }),
    route("GET", "/permissions", { data: permissionCatalog }),
  ];
}

function stockReadRoutes(
  overrides: {
    movement?: typeof movement;
    product?: typeof product;
    reservation?: typeof reservation;
  } = {},
) {
  return [
    route("GET", "/stock/services", { data: services }),
    route("GET", "/stock/categories", { data: categories }),
    route("GET", "/stock/products", { data: [overrides.product ?? product] }),
    route("GET", "/stock/suppliers", { data: suppliers }),
    route("GET", "/stock/movements", { data: [overrides.movement ?? movement] }),
    route("GET", "/stock/reservations", {
      data: overrides.reservation ? [overrides.reservation] : [],
    }),
  ];
}

const allPermissions = [
  "tenant.settings.read",
  "tenant.settings.update",
  "users.read",
  "users.create",
  "users.update",
  "users.deactivate",
  "users.createAdmin",
  "roles.manage",
  "permissions.manage",
  "audit.read",
  "customers.read",
  "customers.create",
  "customers.update",
  "customers.delete",
  "vehicles.read",
  "vehicles.create",
  "vehicles.update",
  "vehicles.delete",
  "stock.catalog.read",
  "stock.catalog.write",
  "stock.suppliers.write",
  "stock.purchases.create",
  "stock.movements.read",
  "stock.exits.create",
  "stock.adjustments.create",
  "stock.reservations.create",
  "stock.reservations.cancel",
];

const tenantSettings = {
  currencyCode: "BRL",
  document: "00.000.000/0001-00",
  id: "settings-1",
  legalName: "Oficina Joia LTDA",
  locale: "pt-BR",
  tenantId: "tenant-1",
  timezone: "America/Sao_Paulo",
  tradeName: "Oficina Joia",
  updatedAt: "2026-07-20T12:00:00.000Z",
};

const users = [
  {
    createdAt: "2026-07-20T12:00:00.000Z",
    deactivatedAt: null,
    email: "admin@joia.local",
    id: "admin-1",
    name: "Admin Joia",
    permissionOverrides: [],
    roles: [{ id: "role-1", key: "admin", name: "Administrador" }],
    status: "active",
    tenantId: "tenant-1",
    updatedAt: "2026-07-20T12:00:00.000Z",
  },
];

const roles = [
  {
    createdAt: "2026-07-20T12:00:00.000Z",
    description: "Acesso administrativo completo",
    id: "role-1",
    isSystem: true,
    key: "admin",
    name: "Administrador",
    permissions: allPermissions,
    tenantId: "tenant-1",
    updatedAt: "2026-07-20T12:00:00.000Z",
  },
];

const permissionCatalog = allPermissions.map((key) => ({
  description: `Permissao ${key}`,
  key,
  name: key,
}));

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

const categories = [
  {
    createdAt: "2026-07-22T12:00:00.000Z",
    deactivatedAt: null,
    description: "Filtros",
    id: "category-1",
    name: "Filtros",
    tenantId: "tenant-1",
    updatedAt: "2026-07-22T12:00:00.000Z",
  },
];

const product = {
  availableQuantity: 1,
  category: { id: "category-1", name: "Filtros" },
  categoryId: "category-1",
  costPrice: "35.00",
  createdAt: "2026-07-22T12:00:00.000Z",
  deactivatedAt: null,
  description: "Filtro motor",
  id: "product-1",
  lowStock: true,
  minimumStock: 2,
  name: "Filtro de oleo",
  physicalQuantity: 3,
  reservedQuantity: 2,
  salePrice: "59.90",
  sku: "FIL-001",
  tenantId: "tenant-1",
  updatedAt: "2026-07-22T12:00:00.000Z",
};

const productAfterPurchase = { ...product, availableQuantity: 4, physicalQuantity: 6 };
const productAfterExit = { ...product, availableQuantity: 3, physicalQuantity: 5 };
const productAfterAdjustment = { ...product, availableQuantity: 5, physicalQuantity: 7 };
const productAfterReservation = {
  ...product,
  availableQuantity: 3,
  physicalQuantity: 7,
  reservedQuantity: 4,
};
const productAfterCancel = {
  ...product,
  availableQuantity: 5,
  physicalQuantity: 7,
  reservedQuantity: 2,
};

const suppliers = [
  {
    createdAt: "2026-07-22T12:00:00.000Z",
    deactivatedAt: null,
    document: "11.222.333/0001-44",
    documentNormalized: "11222333000144",
    id: "supplier-1",
    name: "Auto Pecas Centro",
    notes: null,
    phone: "(11) 3000-0000",
    phoneNormalized: "1130000000",
    tenantId: "tenant-1",
    updatedAt: "2026-07-22T12:00:00.000Z",
  },
];

const purchase = {
  createdAt: "2026-07-22T12:10:00.000Z",
  documentNumber: "NF-100",
  id: "purchase-1",
  itemCount: 1,
  items: [
    {
      id: "purchase-item-1",
      productId: "product-1",
      quantity: 3,
      stockMovementId: "movement-entry-1",
      totalCost: "106.50",
      unitCost: "35.50",
    },
  ],
  purchasedAt: "2026-07-22T12:10:00.000Z",
  supplierId: "supplier-1",
  tenantId: "tenant-1",
  totalAmount: "106.50",
  updatedAt: "2026-07-22T12:10:00.000Z",
};

const movement = {
  balanceAfterAvailable: 1,
  balanceAfterPhysical: 3,
  balanceAfterReserved: 2,
  createdAt: "2026-07-22T12:00:00.000Z",
  id: "movement-1",
  productId: "product-1",
  quantityDelta: 0,
  sourceId: "reservation-0",
  sourceKind: "manual",
  sourceLabel: "Saldo inicial",
  tenantId: "tenant-1",
  type: "reservation",
};

const entryMovement = { ...movement, id: "movement-entry-1", quantityDelta: 3, type: "entry" };
const exitMovement = { ...movement, id: "movement-exit-1", quantityDelta: -1, type: "exit" };
const adjustmentMovement = {
  ...movement,
  id: "movement-adjustment-1",
  quantityDelta: 2,
  type: "adjustment",
};

type ReservationFixture = {
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

const reservation: ReservationFixture = {
  cancelledAt: null,
  createdAt: "2026-07-22T12:20:00.000Z",
  id: "reservation-1",
  productId: "product-1",
  quantity: 2,
  sourceId: null,
  sourceKind: "manual",
  sourceLabel: "OS futura",
  sourceReference: "OS futura",
  status: "active" as const,
  tenantId: "tenant-1",
  updatedAt: "2026-07-22T12:20:00.000Z",
};

const cancelledReservation = {
  ...reservation,
  cancelledAt: "2026-07-22T12:25:00.000Z",
  status: "cancelled" as const,
  updatedAt: "2026-07-22T12:25:00.000Z",
};

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
