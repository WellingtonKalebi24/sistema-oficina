// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("JO.IA customer and vehicle UI", () => {
  it("opens customer and vehicle menus inside the authenticated shell", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      route("GET", "/customers", { data: customers }),
      route("GET", "/vehicles", { data: vehicles }),
    ]);

    render(<App />);
    await login();

    const navigation = screen.getByRole("navigation", { name: "Administracao" });
    expect(navigation).toHaveTextContent("Clientes");
    expect(navigation).toHaveTextContent("Veiculos");

    fireEvent.click(screen.getByRole("button", { name: "Clientes" }));
    expect(await screen.findByRole("table", { name: "Clientes ativos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cadastro de cliente")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Veiculos" }));
    expect(await screen.findByRole("table", { name: "Veiculos ativos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cadastro de veiculo")).toBeInTheDocument();

    assertNoCommunicationLanguage();
  });

  it("searches, creates, edits, soft-deletes and shows customer history", async () => {
    const fetchMock = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      route("GET", "/customers", { data: customers }),
      route("GET", "/vehicles", { data: vehicles }),
      route("GET", "/customers?search=Maria", { data: [customers[0]] }),
      route("POST", "/customers", { data: newCustomer }, 201),
      route("PATCH", "/customers/customer-1", { data: editedCustomer }),
      route("GET", "/customers/customer-1/history", { data: customerHistory }),
      route("DELETE", "/customers/customer-2", null, 204),
      route("POST", "/customers", { error: { message: "Customer document already exists." } }, 409),
    ]);
    globalThis.fetch = fetchMock;

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Clientes" }));

    fireEvent.change(await screen.findByLabelText("Buscar cliente"), {
      target: { value: "Maria" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar clientes" }));
    expect(await screen.findByText("Maria Oliveira")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nome do cliente"), {
      target: { value: "Ana CNPJ Alfa" },
    });
    fireEvent.change(screen.getByLabelText("Documento CPF/CNPJ"), {
      target: { value: "AB12CD34EF5678" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "(11) 98888-7777" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(await screen.findByText("Ana CNPJ Alfa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar Maria Oliveira" }));
    fireEvent.change(screen.getByLabelText("Nome do cliente"), {
      target: { value: "Maria Oliveira Oficina" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(await screen.findByText("Maria Oliveira Oficina")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Historico de Maria Oliveira Oficina" }));
    expect(await screen.findByText("Cliente criado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Excluir Joao Silva" }));
    expect(screen.getByText("Confirmar exclusao logica de Joao Silva?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusao de Joao Silva" }));
    await waitFor(() => expect(screen.queryByText("Joao Silva")).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Nome do cliente"), {
      target: { value: "Documento Duplicado" },
    });
    fireEvent.change(screen.getByLabelText("Documento CPF/CNPJ"), {
      target: { value: "123.456.789-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(await screen.findByText("Documento ativo ja existe neste tenant.")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/customers?search=Maria",
      expect.objectContaining({ method: "GET" }),
    );
    assertNoCommunicationLanguage();
  });

  it("searches, creates, edits, links, soft-deletes and shows vehicle history", async () => {
    const fetchMock = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      route("GET", "/customers", { data: customers }),
      route("GET", "/vehicles", { data: vehicles }),
      route("GET", "/vehicles?search=ABC1D23", { data: [vehicles[0]] }),
      route("POST", "/vehicles", { data: newVehicle }, 201),
      route("PATCH", "/vehicles/vehicle-1", { data: editedVehicle }),
      route("GET", "/vehicles/vehicle-1/history", { data: vehicleHistory }),
      route("DELETE", "/vehicles/vehicle-2", null, 204),
      route("POST", "/vehicles", { error: { message: "Vehicle plate already exists." } }, 409),
    ]);
    globalThis.fetch = fetchMock;

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Veiculos" }));

    fireEvent.change(await screen.findByLabelText("Buscar veiculo"), {
      target: { value: "ABC1D23" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar veiculos" }));
    expect(await screen.findByText("ABC1D23")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Cliente atual"), {
      target: { value: "customer-1" },
    });
    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "XYZ9A88" } });
    fireEvent.change(screen.getByLabelText("Marca"), { target: { value: "Honda" } });
    fireEvent.change(screen.getByLabelText("Modelo"), { target: { value: "Fit" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar veiculo" }));
    expect(await screen.findByText("XYZ9A88")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar ABC1D23" }));
    fireEvent.change(screen.getByLabelText("Cliente atual"), {
      target: { value: "customer-2" },
    });
    fireEvent.change(screen.getByLabelText("Cor"), { target: { value: "Prata" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar veiculo" }));
    expect(await screen.findByText("Joao Silva")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Historico de ABC1D23" }));
    expect(await screen.findByText("Veiculo vinculado ao cliente atual.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Excluir DEF2E45" }));
    expect(screen.getByText("Confirmar exclusao logica de DEF2E45?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusao de DEF2E45" }));
    await waitFor(() => expect(screen.queryByText("DEF2E45")).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "ABC1D23" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar veiculo" }));
    expect(await screen.findByText("Placa ativa ja existe neste tenant.")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/vehicles?search=ABC1D23",
      expect.objectContaining({ method: "GET" }),
    );
    assertNoCommunicationLanguage();
  });

  it("shows empty and server-permission blocked states without treating the UI as authority", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload(["customers.read", "vehicles.read"])),
      ...adminRoutes({ forbiddenAdmin: true }),
      route("GET", "/customers", { data: [] }),
      route("GET", "/vehicles", { error: { message: "Forbidden" } }, 403),
    ]);

    render(<App />);
    await login();

    fireEvent.click(screen.getByRole("button", { name: "Clientes" }));
    expect(await screen.findByText("Nenhum cliente ativo encontrado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Veiculos" }));
    expect(
      await screen.findByText("Acesso bloqueado pela permissao do servidor."),
    ).toBeInTheDocument();

    assertNoCommunicationLanguage();
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
  expect(screen.queryByText(/compre agora|landing|plano/i)).not.toBeInTheDocument();
}

function createFetchMock(routes: MockRoute[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const parsedUrl = new URL(url);
    const path = `${parsedUrl.pathname}${parsedUrl.search}`;
    const found = routes.find((item) => item.method === method && item.path === path);

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

function adminRoutes(options: { forbiddenAdmin?: boolean } = {}) {
  if (options.forbiddenAdmin) {
    return [
      route("GET", "/tenant-settings", { error: { message: "Forbidden" } }, 403),
      route("GET", "/users", { error: { message: "Forbidden" } }, 403),
      route("GET", "/roles", { error: { message: "Forbidden" } }, 403),
      route("GET", "/permissions", { error: { message: "Forbidden" } }, 403),
    ];
  }

  return [
    route("GET", "/tenant-settings", { data: tenantSettings }),
    route("GET", "/users", { data: users }),
    route("GET", "/roles", { data: roles }),
    route("GET", "/permissions", { data: permissionCatalog }),
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
    notes: "Prefere retirada no fim do dia.",
    phone: "(11) 99999-0000",
    phoneNormalized: "11999990000",
    tenantId: "tenant-1",
    updatedAt: "2026-07-20T12:00:00.000Z",
  },
  {
    createdAt: "2026-07-20T12:00:00.000Z",
    deletedAt: null,
    document: "22.333.444/0001-55",
    documentNormalized: "22333444000155",
    documentType: "cnpj",
    email: null,
    id: "customer-2",
    name: "Joao Silva",
    notes: null,
    phone: "(11) 98888-1111",
    phoneNormalized: "11988881111",
    tenantId: "tenant-1",
    updatedAt: "2026-07-20T12:00:00.000Z",
  },
];

const editedCustomer = {
  ...customers[0],
  name: "Maria Oliveira Oficina",
  updatedAt: "2026-07-20T12:05:00.000Z",
};

const newCustomer = {
  ...customers[0],
  document: "AB.12C.D34/EF56-78",
  documentNormalized: "AB12CD34EF5678",
  documentType: "cnpj",
  email: null,
  id: "customer-3",
  name: "Ana CNPJ Alfa",
  phone: "(11) 98888-7777",
  phoneNormalized: "11988887777",
};

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
  {
    brand: "Fiat",
    color: "Preto",
    createdAt: "2026-07-20T12:00:00.000Z",
    customer: { id: "customer-2", name: "Joao Silva" },
    customerId: "customer-2",
    deletedAt: null,
    id: "vehicle-2",
    mileage: null,
    model: "Strada",
    notes: null,
    plate: "DEF2E45",
    plateNormalized: "DEF2E45",
    tenantId: "tenant-1",
    updatedAt: "2026-07-20T12:00:00.000Z",
    vin: null,
    vinNormalized: null,
    year: 2020,
  },
];

const newVehicle = {
  ...vehicles[0],
  brand: "Honda",
  id: "vehicle-3",
  model: "Fit",
  plate: "XYZ9A88",
  plateNormalized: "XYZ9A88",
};

const editedVehicle = {
  ...vehicles[0],
  color: "Prata",
  customer: { id: "customer-2", name: "Joao Silva" },
  customerId: "customer-2",
};

const customerHistory = [
  {
    createdAt: "2026-07-20T12:00:00.000Z",
    id: "history-1",
    metadata: { fields: ["name"] },
    summary: "Cliente criado.",
    type: "customer.created",
  },
];

const vehicleHistory = [
  {
    createdAt: "2026-07-20T12:00:00.000Z",
    id: "history-2",
    metadata: { customerId: "customer-1" },
    summary: "Veiculo vinculado ao cliente atual.",
    type: "vehicle.linked",
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
