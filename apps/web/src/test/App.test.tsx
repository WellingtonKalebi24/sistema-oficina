// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("JO.IA web foundation app", () => {
  it("lets the operator submit a foundation check and see persisted API data", async () => {
    const createdAt = "2026-07-17T23:46:09.037Z";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: {
              id: "check-1",
              label: "web-api-db",
              status: "recorded",
              createdAt,
              updatedAt: createdAt,
            },
          },
          201,
        ),
      );

    globalThis.fetch = fetchMock;

    render(<App />);

    expect(await screen.findByText("Nenhum registro ainda")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Etiqueta da verificacao"), {
      target: { value: "web-api-db" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("web-api-db")).toBeInTheDocument();
    expect(screen.getByText("recorded")).toBeInTheDocument();
    expect(
      screen.getByText("Verificacao registrada e persistida no PostgreSQL."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/foundation-checks",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("renders loading, empty, success, error and destructive confirmation states accessibly", async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("offline"));

    render(<App />);

    expect(screen.getByLabelText("Carregando registros")).toBeInTheDocument();
    expect(await screen.findByText("Conexao indisponivel")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("A API nao respondeu");
    expect(
      screen.getByRole("button", { name: "Exemplo de confirmacao destrutiva" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Estado do sistema")).toHaveTextContent("API indisponivel");
  });

  it("presents a compact operational workspace without marketing copy", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }));

    render(<App />);

    await waitFor(() => expect(screen.getByLabelText("Ambiente operacional")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Fundacao tecnica" })).toBeInTheDocument();
    expect(screen.queryByText(/compre agora/i)).not.toBeInTheDocument();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
