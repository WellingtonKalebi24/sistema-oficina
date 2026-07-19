// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

const originalFetch = globalThis.fetch;
const originalStorage = window.localStorage;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("JO.IA authenticated admin UI", () => {
  it("shows bootstrap only when setup is pending and creates the first admin", async () => {
    const fetchMock = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: false } }),
      route(
        "POST",
        "/bootstrap/create-first-admin",
        {
          data: {
            admin: {
              email: "admin@joia.local",
              id: "admin-1",
              permissions: allPermissions,
              tenantId: "tenant-1",
            },
            companySettings: {
              id: "settings-1",
              tenantId: "tenant-1",
              tradeName: "Oficina Joia",
            },
            tenant: {
              id: "tenant-1",
              name: "Oficina Joia",
            },
          },
        },
        201,
      ),
    ]);
    globalThis.fetch = fetchMock;

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Configurar primeira oficina" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome da oficina"), {
      target: { value: "Oficina Joia" },
    });
    fireEvent.change(screen.getByLabelText("Nome do administrador"), {
      target: { value: "Admin Joia" },
    });
    fireEvent.change(screen.getByLabelText("Email do administrador"), {
      target: { value: "admin@joia.local" },
    });
    fireEvent.change(screen.getByLabelText("Senha inicial"), {
      target: { value: "senha-segura-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar primeiro acesso" }));

    expect(
      await screen.findByText("Primeiro administrador criado. Entre para continuar."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/bootstrap/create-first-admin",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("logs in, stores browser-managed session state and opens the compact admin shell", async () => {
    const fetchMock = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      route("GET", "/tenant-settings", { data: tenantSettings }),
      route("GET", "/users", { data: users }),
      route("GET", "/roles", { data: roles }),
      route("GET", "/permissions", { data: permissionCatalog }),
    ]);
    globalThis.fetch = fetchMock;

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Entrar no JO.IA" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@joia.local" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Administracao" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Administracao" })).toHaveTextContent("Oficina");
    expect(screen.getByRole("navigation", { name: "Administracao" })).toHaveTextContent("Usuarios");
    expect(screen.getByRole("navigation", { name: "Administracao" })).toHaveTextContent("Papeis");
    expect(screen.getByRole("navigation", { name: "Administracao" })).toHaveTextContent(
      "Permissoes",
    );
    expect(screen.getByLabelText("Sessao autenticada")).toHaveTextContent("Oficina Joia");
    expect(originalStorage.getItem("joia.auth.session")).toContain("refresh-token-1");
  });

  it("loads table-first user and role lists without marketing or communication language", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      route("GET", "/tenant-settings", { data: tenantSettings }),
      route("GET", "/users", { data: users }),
      route("GET", "/roles", { data: roles }),
      route("GET", "/permissions", { data: permissionCatalog }),
    ]);

    render(<App />);
    await login();

    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
    const usersTable = await screen.findByRole("table", { name: "Usuarios cadastrados" });
    expect(within(usersTable).getByText("Admin Joia")).toBeInTheDocument();
    expect(screen.getByLabelText("Criar usuario")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Papeis" }));
    const rolesTable = await screen.findByRole("table", { name: "Papeis cadastrados" });
    expect(within(rolesTable).getByText("Administrador")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Permissoes" }));
    expect(
      await screen.findByRole("table", { name: "Catalogo de permissoes" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Overrides de usuario")).toBeInTheDocument();

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/whatsapp|sms|notificacao|campanha|mensagem|disparo/i);
    expect(screen.queryByText(/compre agora|plano|landing/i)).not.toBeInTheDocument();
  });

  it("surfaces backend 403 as a server-permission blocked state", async () => {
    globalThis.fetch = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/login", sessionPayload()),
      route("GET", "/tenant-settings", { data: tenantSettings }),
      route("GET", "/users", { error: { message: "Forbidden" } }, 403),
      route("GET", "/roles", { data: roles }),
      route("GET", "/permissions", { data: permissionCatalog }),
    ]);

    render(<App />);
    await login();
    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));

    expect(
      await screen.findByText("Acesso bloqueado pela permissao do servidor."),
    ).toBeInTheDocument();
  });

  it("calls reset, change-password and active-session logout endpoints", async () => {
    const fetchMock = createFetchMock([
      route("GET", "/bootstrap/status", { data: { bootstrapped: true } }),
      route("POST", "/auth/password-reset/request", { data: { status: "accepted" } }, 202),
      route("POST", "/auth/password-reset/complete", null, 204),
      route("POST", "/auth/login", sessionPayload()),
      route("GET", "/tenant-settings", { data: tenantSettings }),
      route("GET", "/users", { data: users }),
      route("GET", "/roles", { data: roles }),
      route("GET", "/permissions", { data: permissionCatalog }),
      route("POST", "/auth/change-password", null, 204),
      route("POST", "/auth/logout", null, 204),
    ]);
    globalThis.fetch = fetchMock;

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Recuperar senha" }));
    fireEvent.change(screen.getByLabelText("Email cadastrado"), {
      target: { value: "admin@joia.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar codigo" }));
    expect(
      await screen.findByText("Se o email existir, o codigo foi registrado para recuperacao."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Codigo de recuperacao"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "nova-senha-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Concluir redefinicao" }));
    expect(
      await screen.findByText("Senha redefinida. Entre com a nova senha."),
    ).toBeInTheDocument();

    await login();
    fireEvent.click(screen.getByRole("button", { name: "Seguranca" }));
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "nova-senha-123" } });
    fireEvent.change(screen.getByLabelText("Nova senha autenticada"), {
      target: { value: "senha-alterada-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(await screen.findByText("Senha alterada para esta conta.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3001/auth/logout",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByRole("heading", { name: "Entrar no JO.IA" })).toBeInTheDocument();
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

function createFetchMock(routes: MockRoute[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const pathname = new URL(url).pathname;
    const found = routes.find((item) => item.method === method && item.pathname === pathname);

    if (!found) {
      throw new Error(`Unexpected fetch ${method} ${pathname}`);
    }

    return jsonResponse(found.body, found.status);
  });
}

function route(method: string, pathname: string, body: unknown, status = 200): MockRoute {
  return { body, method, pathname, status };
}

type MockRoute = {
  body: unknown;
  method: string;
  pathname: string;
  status: number;
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
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
  updatedAt: "2026-07-19T12:00:00.000Z",
};

const users = [
  {
    createdAt: "2026-07-19T12:00:00.000Z",
    deactivatedAt: null,
    email: "admin@joia.local",
    id: "admin-1",
    name: "Admin Joia",
    permissionOverrides: [{ effect: "allow", permissionKey: "users.createAdmin", reason: "Owner" }],
    roles: [{ id: "role-1", key: "admin", name: "Administrador" }],
    status: "active",
    tenantId: "tenant-1",
    updatedAt: "2026-07-19T12:00:00.000Z",
  },
];

const roles = [
  {
    createdAt: "2026-07-19T12:00:00.000Z",
    description: "Acesso administrativo completo",
    id: "role-1",
    isSystem: true,
    key: "admin",
    name: "Administrador",
    permissions: allPermissions,
    tenantId: "tenant-1",
    updatedAt: "2026-07-19T12:00:00.000Z",
  },
];

const permissionCatalog = allPermissions.map((key) => ({
  description: `Permissao ${key}`,
  key,
  name: key,
}));

function sessionPayload() {
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
        permissions: allPermissions,
        status: "active",
        tenantId: "tenant-1",
      },
    },
  };
}
