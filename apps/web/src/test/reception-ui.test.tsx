// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("JO.IA reception agenda UI", () => {
  it("D-12/D-17 exposes Agenda navigation and renders daily appointments as the primary table", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      route("GET", "/reception/appointments?date=2026-07-24", { data: dailyAppointments }),
    ]);

    render(<App />);
    await login();

    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));

    const table = await screen.findByRole("table", { name: "Agenda diaria" });
    expect(table).toHaveTextContent("Horario");
    expect(table).toHaveTextContent("Cliente");
    expect(table).toHaveTextContent("Veiculo");
    expect(table).toHaveTextContent("Placa");
    expect(table).toHaveTextContent("Servico previsto");
    expect(table).toHaveTextContent("Status");
    expect(table).toHaveTextContent("Origem");
    expect(table).toHaveTextContent("Acoes");
    expect(table).toHaveTextContent("08:30");
    expect(table).toHaveTextContent("Maria Oliveira");
    expect(table).toHaveTextContent("ABC1D23");

    const firstRow = within(table).getByText("Maria Oliveira").closest("tr");
    expect(firstRow).not.toBeNull();
    expect(
      within(firstRow as HTMLTableRowElement).getByRole("button", { name: "Fazer check-in" }),
    ).toBeInTheDocument();
    expect(
      within(firstRow as HTMLTableRowElement).getByRole("button", { name: "Editar" }),
    ).toBeInTheDocument();
    expect(
      within(firstRow as HTMLTableRowElement).getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();

    assertNoCommunicationLanguage();
  });

  it("D-12 renders weekly appointment data from the reception API", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      route("GET", "/reception/appointments?date=2026-07-24", { data: dailyAppointments }),
      route("GET", "/reception/appointments?weekOf=2026-07-20", { data: weeklyAppointments }),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));

    await screen.findByRole("table", { name: "Agenda diaria" });
    fireEvent.click(screen.getByRole("tab", { name: "Agenda semanal" }));

    const weekly = await screen.findByLabelText("Agenda semanal");
    expect(weekly).toHaveTextContent("Segunda");
    expect(weekly).toHaveTextContent("Quarta");
    expect(weekly).toHaveTextContent("Joao Santos");
    expect(weekly).toHaveTextContent("Higienizacao interna");

    assertNoCommunicationLanguage();
  });

  it("D-15 keeps row actions limited to Fazer check-in, Editar and Cancelar", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      route("GET", "/reception/appointments?date=2026-07-24", { data: dailyAppointments }),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));

    const table = await screen.findByRole("table", { name: "Agenda diaria" });
    const actionsHeader = within(table).getByText("Acoes").closest("table") as HTMLTableElement;
    const rowButtons = within(actionsHeader).getAllByRole("button").map((button) => button.textContent);

    expect(rowButtons).toEqual(["Fazer check-in", "Editar", "Cancelar"]);
    assertNoCommunicationLanguage();
  });

  it("renders backend 403 as the authoritative reception blocked state", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      route("GET", "/reception/appointments?date=2026-07-24", { error: { message: "Forbidden" } }, 403),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));

    expect(
      await screen.findByText("Acesso bloqueado pela permissao do servidor."),
    ).toBeInTheDocument();
    assertNoCommunicationLanguage();
  });

  it("REC-06 supports appointment-origin check-in, later consultation and confirmed audit-relevant edits", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      route("GET", "/reception/appointments?date=2026-07-24", { data: dailyAppointments }),
      route("GET", "/reception/check-ins", { data: [] }),
      route("POST", "/reception/check-ins", { data: appointmentCheckIn }, 201),
      route("GET", "/reception/check-ins", { data: [appointmentCheckIn] }),
      route("GET", "/reception/check-ins/check-in-1", { data: appointmentCheckIn }),
      route("PATCH", "/reception/check-ins/check-in-1", { data: editedCheckIn }),
      route("GET", "/reception/check-ins", { data: [editedCheckIn] }),
    ]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));

    const table = await screen.findByRole("table", { name: "Agenda diaria" });
    fireEvent.click(within(table).getByRole("button", { name: "Fazer check-in" }));

    const form = await screen.findByRole("form", { name: "Check-in de recepcao" });
    expect(form).toHaveTextContent("Maria Oliveira");
    expect(form).toHaveTextContent("ABC1D23");
    expect(form).toHaveTextContent("24/07/2026");
    expect(within(form).getByLabelText(/Cliente/)).toBeRequired();
    expect(within(form).getByLabelText(/Veiculo/)).toBeRequired();
    expect(within(form).getByLabelText(/Entrada/)).toBeRequired();
    expect(within(form).getByLabelText(/Combustivel/)).toBeRequired();
    expect(within(form).getByLabelText(/Quilometragem/)).not.toBeRequired();
    expect(within(form).getByLabelText(/Itens deixados/)).not.toBeRequired();

    fireEvent.change(within(form).getByLabelText(/Quilometragem/), {
      target: { value: "45120" },
    });
    fireEvent.change(within(form).getByLabelText(/Combustivel/), {
      target: { value: "1/2" },
    });
    fireEvent.change(within(form).getByLabelText(/Avarias/), {
      target: { value: "Risco no parachoque" },
    });
    fireEvent.click(within(form).getByLabelText("Lataria conferida"));
    fireEvent.click(within(form).getByRole("button", { name: "Concluir check-in" }));

    expect(
      await screen.findByText("Check-in concluido e status definido como Aguardando diagnostico."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Check-ins" }));

    const checkInsTable = await screen.findByRole("table", { name: "Check-ins recebidos" });
    expect(checkInsTable).toHaveTextContent("Aguardando diagnostico");
    expect(checkInsTable).toHaveTextContent("45120 km");
    fireEvent.click(within(checkInsTable).getByRole("button", { name: "Consultar check-in" }));

    const detail = await screen.findByRole("region", { name: "Detalhe do check-in" });
    expect(detail).toHaveTextContent("Recepcao para diagnostico");
    expect(detail).toHaveTextContent("Lataria conferida");

    fireEvent.change(within(detail).getByLabelText(/Quilometragem/), {
      target: { value: "45200" },
    });
    fireEvent.change(within(detail).getByLabelText(/Itens deixados/), {
      target: { value: "Chave reserva" },
    });
    fireEvent.click(within(detail).getByRole("button", { name: "Salvar checklist" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Confirmar edicao dos dados auditaveis deste check-in?",
    );
    expect(await screen.findByText("Checklist atualizado com auditoria do backend.")).toBeInTheDocument();
    assertNoCommunicationLanguage();
  });

  it("REC-04 supports direct check-in with tenant-scoped customer and vehicle selection", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      route("GET", "/reception/appointments?date=2026-07-24", { data: [] }),
      route("GET", "/reception/check-ins", { data: [] }),
      route("POST", "/reception/check-ins", { data: directCheckIn }, 201),
      route("GET", "/reception/check-ins", { data: [directCheckIn] }),
      route("GET", "/reception/appointments?date=2026-07-24", {
        data: [directConvertedAppointment],
      }),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    await screen.findByText("Nenhum agendamento encontrado");

    fireEvent.click(screen.getByRole("button", { name: "Registrar check-in direto" }));

    const form = await screen.findByRole("form", { name: "Check-in de recepcao" });
    expect(within(form).getByLabelText(/Cliente/)).toHaveValue("customer-1");
    expect(within(form).getByLabelText(/Veiculo/)).toHaveValue("vehicle-1");

    fireEvent.change(within(form).getByLabelText(/Combustivel/), {
      target: { value: "3/4" },
    });
    fireEvent.change(within(form).getByLabelText(/Avarias/), {
      target: { value: "Sem avarias aparentes" },
    });
    fireEvent.click(within(form).getByLabelText("Lataria conferida"));
    fireEvent.click(within(form).getByRole("button", { name: "Concluir check-in" }));

    expect(
      await screen.findByText("Check-in concluido e status definido como Aguardando diagnostico."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Convertido")).toBeInTheDocument();
    assertNoCommunicationLanguage();
  });

  it("renders backend 403 from check-in APIs as the authoritative reception blocked state", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      ...adminRoutes(),
      ...customerVehicleRoutes(),
      route("GET", "/reception/appointments?date=2026-07-24", { data: dailyAppointments }),
      route("GET", "/reception/check-ins", { error: { message: "Forbidden" } }, 403),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    fireEvent.click(await screen.findByRole("tab", { name: "Check-ins" }));

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

function customerVehicleRoutes() {
  return [
    route("GET", "/customers", { data: customers }),
    route("GET", "/vehicles", { data: vehicles }),
  ];
}

const allPermissions = [
  "tenant.settings.read",
  "users.read",
  "roles.manage",
  "permissions.manage",
  "customers.read",
  "vehicles.read",
  "reception.appointments.read",
  "reception.appointments.write",
  "reception.appointments.cancel",
  "reception.checkins.read",
  "reception.checkins.write",
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

const baseAppointment = {
  actions: ["Fazer check-in", "Editar", "Cancelar"],
  cancelledAt: null,
  cancelledByUserId: null,
  createdAt: "2026-07-24T10:00:00.000Z",
  createdByUserId: "admin-1",
  customer: { id: "customer-1", name: "Maria Oliveira" },
  customerId: "customer-1",
  expectedService: "Troca de oleo",
  id: "appointment-1",
  notes: null,
  origin: "Balcao",
  startsAt: "2026-07-24T11:30:00.000Z",
  status: "Agendado",
  tenantId: "tenant-1",
  updatedAt: "2026-07-24T10:00:00.000Z",
  vehicle: { id: "vehicle-1", plateNormalized: "ABC1D23" },
  vehicleId: "vehicle-1",
};

const dailyAppointments = [
  appointmentFixture({
    customer: { id: "customer-1", name: "Maria Oliveira" },
    customerId: "customer-1",
    expectedService: "Troca de oleo",
    id: "appointment-1",
    startsAt: "2026-07-24T11:30:00.000Z",
    vehicle: { id: "vehicle-1", plateNormalized: "ABC1D23" },
    vehicleId: "vehicle-1",
  }),
];

const convertedAppointment = appointmentFixture({
  customer: { id: "customer-1", name: "Maria Oliveira" },
  customerId: "customer-1",
  expectedService: "Recepcao para diagnostico",
  id: "appointment-1",
  startsAt: "2026-07-24T11:30:00.000Z",
  status: "Convertido",
  vehicle: { id: "vehicle-1", plateNormalized: "ABC1D23" },
  vehicleId: "vehicle-1",
});

const directConvertedAppointment = appointmentFixture({
  customer: { id: "customer-1", name: "Maria Oliveira" },
  customerId: "customer-1",
  expectedService: "Check-in direto",
  id: "appointment-direct-1",
  origin: "direct-check-in",
  startsAt: "2026-07-24T12:00:00.000Z",
  status: "Convertido",
  vehicle: { id: "vehicle-1", plateNormalized: "ABC1D23" },
  vehicleId: "vehicle-1",
});

const appointmentCheckIn = {
  appointment: {
    expectedService: convertedAppointment.expectedService,
    id: convertedAppointment.id,
    origin: convertedAppointment.origin,
    startsAt: convertedAppointment.startsAt,
    status: convertedAppointment.status,
  },
  appointmentId: convertedAppointment.id,
  checklistItems: [
    {
      condition: "ok",
      id: "checklist-1",
      label: "Lataria conferida",
      notes: null,
    },
  ],
  createdAt: "2026-07-24T11:35:00.000Z",
  createdByUserId: "admin-1",
  customer: { id: "customer-1", name: "Maria Oliveira" },
  customerId: "customer-1",
  damageNotes: "Risco no parachoque",
  enteredAt: "2026-07-24T11:35:00.000Z",
  fuelLevel: "1/2",
  id: "check-in-1",
  itemsLeft: null,
  mileage: 45120,
  status: "Aguardando diagnostico",
  tenantId: "tenant-1",
  updatedAt: "2026-07-24T11:35:00.000Z",
  updatedByUserId: null,
  vehicle: { id: "vehicle-1", plateNormalized: "ABC1D23" },
  vehicleId: "vehicle-1",
};

const editedCheckIn = {
  ...appointmentCheckIn,
  itemsLeft: "Chave reserva",
  mileage: 45200,
  updatedByUserId: "admin-1",
};

const directCheckIn = {
  ...appointmentCheckIn,
  appointment: {
    expectedService: directConvertedAppointment.expectedService,
    id: directConvertedAppointment.id,
    origin: directConvertedAppointment.origin,
    startsAt: directConvertedAppointment.startsAt,
    status: directConvertedAppointment.status,
  },
  appointmentId: directConvertedAppointment.id,
  damageNotes: "Sem avarias aparentes",
  fuelLevel: "3/4",
  id: "check-in-direct-1",
  mileage: null,
};

const weeklyAppointments = [
  appointmentFixture({
    customer: { id: "customer-2", name: "Joao Santos" },
    customerId: "customer-2",
    expectedService: "Higienizacao interna",
    id: "appointment-2",
    startsAt: "2026-07-20T13:00:00.000Z",
    vehicle: { id: "vehicle-2", plateNormalized: "XYZ9A88" },
    vehicleId: "vehicle-2",
  }),
  appointmentFixture({
    customer: { id: "customer-1", name: "Maria Oliveira" },
    customerId: "customer-1",
    expectedService: "Revisao preventiva",
    id: "appointment-3",
    startsAt: "2026-07-22T14:00:00.000Z",
    vehicle: { id: "vehicle-1", plateNormalized: "ABC1D23" },
    vehicleId: "vehicle-1",
  }),
];

function appointmentFixture(overrides: Partial<typeof baseAppointment>) {
  return { ...baseAppointment, ...overrides };
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
