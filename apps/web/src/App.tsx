import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createFoundationCheck,
  FoundationCheck,
  listFoundationChecks,
} from "./api/foundationChecks.js";
import { formatCurrency, formatDateTime } from "./design/formatters.js";

type LoadState = "idle" | "loading" | "ready" | "error";
type SubmitState = "idle" | "saving" | "success" | "error";

export function App() {
  const [checks, setChecks] = useState<FoundationCheck[]>([]);
  const [label, setLabel] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("Pronto para validar a fundacao tecnica.");

  useEffect(() => {
    let active = true;

    async function loadChecks() {
      setLoadState("loading");

      try {
        const rows = await listFoundationChecks();

        if (!active) {
          return;
        }

        setChecks(rows);
        setLoadState("ready");
      } catch {
        if (!active) {
          return;
        }

        setLoadState("error");
        setMessage("A API nao respondeu. Confira Docker Compose e DATABASE_URL.");
      }
    }

    void loadChecks();

    return () => {
      active = false;
    };
  }, []);

  const statusText = useMemo(() => {
    if (loadState === "loading") {
      return "Sincronizando com a API";
    }

    if (loadState === "error") {
      return "API indisponivel";
    }

    return "API conectada";
  }, [loadState]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanLabel = label.trim();

    if (!cleanLabel) {
      setSubmitState("error");
      setMessage("Informe uma etiqueta antes de registrar.");
      return;
    }

    setSubmitState("saving");

    try {
      const record = await createFoundationCheck(cleanLabel);
      setChecks((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      setLabel("");
      setSubmitState("success");
      setMessage("Verificacao registrada e persistida no PostgreSQL.");
    } catch {
      setSubmitState("error");
      setMessage("Falha ao gravar. A validacao do backend continua obrigatoria.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Cabecalho do workspace">
        <div>
          <p className="eyebrow">JO.IA Oficina</p>
          <h1>Fundacao tecnica</h1>
        </div>
        <div className="status-strip" aria-label="Estado do sistema">
          <span
            className={loadState === "error" ? "status-dot status-dot--danger" : "status-dot"}
          />
          <span>{statusText}</span>
        </div>
      </header>

      <section className="workspace-grid" aria-label="Ambiente operacional">
        <form className="panel action-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Walking skeleton</p>
              <h2>Registrar verificacao</h2>
            </div>
            <span className="pill">PostgreSQL</span>
          </div>

          <label className="field">
            <span>Etiqueta da verificacao</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="ex.: recepcao-api-db"
              aria-describedby="label-help"
            />
          </label>
          <p id="label-help" className="helper-text">
            Use dados neutros. Cadastros reais entram apenas nas fases de negocio.
          </p>

          <div className="button-row">
            <button type="submit" disabled={submitState === "saving"}>
              {submitState === "saving" ? "Gravando..." : "Registrar"}
            </button>
            <button type="button" className="button-secondary" onClick={() => setLabel("")}>
              Limpar
            </button>
          </div>

          <p
            className={`callout callout--${submitState === "error" ? "danger" : "success"}`}
            role="status"
          >
            {message}
          </p>
        </form>

        <section className="panel" aria-labelledby="checks-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Persistencia</p>
              <h2 id="checks-title">Registros retornados</h2>
            </div>
            <span className="pill">{checks.length} itens</span>
          </div>

          {loadState === "loading" ? <LoadingRows /> : null}
          {loadState === "ready" && checks.length === 0 ? <EmptyState /> : null}
          {checks.length > 0 ? <ChecksTable checks={checks} /> : null}
          {loadState === "error" ? (
            <div className="empty-state empty-state--danger">
              <strong>Conexao indisponivel</strong>
              <span>Reinicie `docker compose up --build -d db api web` e tente novamente.</span>
            </div>
          ) : null}
        </section>
      </section>

      <section className="state-board" aria-label="Estados visuais documentados">
        <div className="state-card">
          <span className="state-token state-token--info">Carregando</span>
          <p>Skeletons compactos preservam a leitura operacional.</p>
        </div>
        <div className="state-card">
          <span className="state-token state-token--success">Sucesso</span>
          <p>A confirmacao mostra persistencia sem prometer envio externo.</p>
        </div>
        <div className="state-card">
          <span className="state-token state-token--danger">Destrutivo</span>
          <p>Confirmacoes destrutivas exigem acao explicita do operador.</p>
          <button
            type="button"
            className="button-danger"
            aria-label="Exemplo de confirmacao destrutiva"
          >
            Confirmar
          </button>
        </div>
      </section>
    </main>
  );
}

function LoadingRows() {
  return (
    <div className="skeleton-list" aria-label="Carregando registros">
      <span />
      <span />
      <span />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <strong>Nenhum registro ainda</strong>
      <span>Registre a primeira verificacao para provar o fluxo web-api-banco.</span>
    </div>
  );
}

function ChecksTable({ checks }: { checks: FoundationCheck[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Etiqueta</th>
            <th scope="col">Status</th>
            <th scope="col">Criado em</th>
            <th scope="col">Custo demo</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check, index) => (
            <tr key={check.id}>
              <td>{check.label}</td>
              <td>
                <span className="status-badge">{check.status}</span>
              </td>
              <td>{formatDateTime(check.createdAt)}</td>
              <td>{formatCurrency((index + 1) * 125.5)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
