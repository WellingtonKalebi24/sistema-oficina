// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("JO.IA web app shell", () => {
  it("routes a bootstrapped workspace to login", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { bootstrapped: true } }));

    render(<App />);

    expect(screen.getByLabelText("Sincronizando com a API")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Entrar no JO.IA" })).toBeInTheDocument();
    expect(screen.getByLabelText("Acesso operacional")).toBeInTheDocument();
  });

  it("shows a compact error state when bootstrap status is unavailable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("offline"));

    render(<App />);

    expect(await screen.findByText("Conexao indisponivel")).toBeInTheDocument();
    expect(screen.getByLabelText("Sessao autenticada")).toHaveTextContent("A API nao respondeu");
  });

  it("keeps the first viewport operational and free of prohibited communication language", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { bootstrapped: false } }));

    render(<App />);

    await waitFor(() => expect(screen.getByLabelText("Bootstrap da oficina")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "JO.IA Oficina" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /whatsapp|sms|notificacao|campanha|mensagem|disparo/i,
    );
    expect(screen.queryByText(/compre agora|landing/i)).not.toBeInTheDocument();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
