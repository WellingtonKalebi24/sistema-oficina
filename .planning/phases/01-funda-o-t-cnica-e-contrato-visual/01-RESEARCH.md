# Phase 01: Fundacao Tecnica e Contrato Visual - Research

**Researched:** 2026-07-14 [VERIFIED: local system date]
**Domain:** Greenfield React/Vite/TypeScript + Node/Express/TypeScript + PostgreSQL/Prisma + Docker Compose foundation [VERIFIED: AGENTS.md]
**Confidence:** MEDIUM [VERIFIED: official docs + npm registry + local probes]

## User Constraints (from CONTEXT.md)

All items in this section are copied from `.planning/phases/01-funda-o-t-cnica-e-contrato-visual/01-CONTEXT.md`. [VERIFIED: 01-CONTEXT.md]

### Locked Decisions

## Implementation Decisions

### Workspace Shape

- **D-01:** Use a simple TypeScript workspace layout with separate frontend and backend applications and room for shared types only when needed. Recommended starting shape: `apps/web`, `apps/api`, `packages/shared`, `prisma`, `docs`.
- **D-02:** Prefer npm workspaces for the initial scaffold because Node/npm are already assumed and this avoids adding package-manager risk before the app exists.
- **D-03:** Keep frontend and backend runnable independently as well as through Docker Compose.

### Quality And Validation

- **D-04:** Phase 1 must define scripts for lint, format/check, type check and tests at the project root.
- **D-05:** Use strict TypeScript settings from the beginning for both web and API.
- **D-06:** Use automated tests that prove the foundation works, not just file existence. The minimum verification should include API health behavior and database connectivity.
- **D-07:** Keep mocks limited to tests; no permanent mock data should stand in for final behavior.

### Docker, Database And Configuration

- **D-08:** Docker Compose should include PostgreSQL plus the services needed to run the API and frontend locally.
- **D-09:** Prisma should own schema history through versioned migrations. Ad hoc database changes are out of bounds.
- **D-10:** Provide `.env.example` and documentation for required variables. Real `.env` files and secrets remain untracked.
- **D-11:** Development seed data should be deterministic, explicit and safe to rerun locally.

### Visual Contract

- **D-12:** JO.IA should feel like a serious operational SaaS for automotive shops: dense enough for repeated office use, calm, scannable and not marketing-like.
- **D-13:** The visual contract must define palette, typography, spacing, radius, shadows, buttons, forms, tables, filters, modals, status colors, loading states, empty states, error/success states, destructive confirmations, responsive behavior, keyboard focus and Brazilian date/time/currency formatting.
- **D-14:** Use restrained components with compact dashboards, tables and forms. Avoid oversized hero sections, decorative card-heavy layouts and one-note color palettes.
- **D-15:** Alerts in the eventual UI are visual calculations only; do not introduce notification centers, message counters or notification-like entities.

### the agent's Discretion

The planner may choose exact libraries for linting, formatting, testing and UI primitives if they fit the stack, keep Phase 1 small and preserve the constraints above. The planner should avoid adding framework complexity that is not needed for the foundation.

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope.

## Summary

Phase 1 should create a walking skeleton, not a partial business module. [VERIFIED: 01-CONTEXT.md] Use npm workspaces with `apps/web`, `apps/api`, `packages/shared`, root-level `prisma`, and `docs`; npm workspaces are explicitly supported by npm for managing nested local packages from a single root and running scripts across workspaces. [CITED: https://docs.npmjs.com/cli/v10/using-npm/workspaces/]

The smallest meaningful vertical slice is: PostgreSQL starts in Docker Compose, Prisma applies one initial migration, seed creates deterministic dev data, API health verifies startup plus database connectivity, the web app calls the API, and one UI interaction creates or updates a non-business `FoundationCheck` row. [VERIFIED: 01-CONTEXT.md] This proves real DB read/write without starting auth, tenants, customers, stock, quotes, or OS modules. [VERIFIED: ROADMAP.md]

**Primary recommendation:** Use npm workspaces, Vite React TS, Express 5, Prisma 7, Vitest, Testing Library, ESLint flat config, Prettier, Pino, Docker Compose healthchecks, and a documented JO.IA visual contract; keep all Phase 1 data to a neutral `FoundationCheck` model. [VERIFIED: official docs + npm registry + 01-CONTEXT.md]

## Project Constraints (from AGENTS.md)

- Use React, Vite, TypeScript, Node.js, Express, PostgreSQL, Prisma, and Docker Compose unless a technical justification and recorded decision changes the stack. [VERIFIED: AGENTS.md]
- Enforce authorization in the backend; frontend hiding is not a security control. [VERIFIED: AGENTS.md]
- Filter and validate operational records by authenticated tenant in later tenant-aware phases. [VERIFIED: AGENTS.md]
- Do not send messages, open WhatsApp automatically, or register delivery/read communications. [VERIFIED: AGENTS.md]
- Use transactions for stock, quote, work order, and finance operations when those phases introduce them. [VERIFIED: AGENTS.md]
- Critical actions must be auditable without storing secrets. [VERIFIED: AGENTS.md]
- Do not complete phases with failing lint, type check, tests, migrations, or critical validation. [VERIFIED: AGENTS.md]
- Every phase needs executable verification; files, visible screens, or endpoints alone are not proof. [VERIFIED: AGENTS.md]
- Start code-changing work through GSD workflows; direct edits outside GSD are disallowed unless explicitly bypassed. [VERIFIED: AGENTS.md]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Developer can run web, API, and PostgreSQL locally through Docker Compose. | Compose services `db`, `api`, `web` with `db` healthcheck and `depends_on: service_healthy`. [CITED: https://docs.docker.com/compose/how-tos/startup-order/] |
| FND-02 | Developer can execute migrations from a clean PostgreSQL database. | Prisma `migrate dev --name init` creates versioned migration history. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/getting-started] |
| FND-03 | Developer can run lint, format check, type check, and tests. | Root npm scripts should fan out through workspaces; ESLint flat config and Prettier check are current official patterns. [CITED: https://typescript-eslint.io/getting-started/] |
| FND-04 | API exposes health check verifying startup and DB connectivity. | Express route should call Prisma `$queryRaw` or a tiny repository read and return structured JSON. [VERIFIED: Prisma docs + Express docs] |
| FND-05 | API handles errors through a global strategy avoiding secret leaks. | Express error middleware must be registered after routes and return sanitized JSON. [CITED: https://expressjs.com/en/guide/error-handling/] |
| FND-06 | Application emits structured logs for debugging and audit follow-up. | Pino emits JSON logs and `pino-http` avoids request body logging by default. [CITED: https://github.com/pinojs/pino] |
| FND-07 | Developer can seed controlled development data safely. | Prisma v7 seed is explicit via `prisma db seed` and configured in `prisma.config.ts`. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding] |
| FND-08 | Developer can follow local setup docs. | Add `docs/LOCAL_SETUP.md` with exact commands and expected outputs. [VERIFIED: REQUIREMENTS.md] |
| VUX-01 | Team can reference JO.IA visual contract. | Add `docs/VISUAL_CONTRACT.md` before major screens. [VERIFIED: PROJETO.md] |
| VUX-02 | UI uses consistent palette, typography, spacing, radius, shadows, buttons, forms, tables, filters, modals, and status colors. | Contract must define tokens and first CSS variables. [VERIFIED: 01-CONTEXT.md] |
| VUX-03 | UI includes loading, skeleton, empty, success, error, and destructive confirmation states. | Contract plus first UI should demonstrate each state as static patterns, not fake business features. [VERIFIED: 01-CONTEXT.md] |
| VUX-04 | UI supports minimum accessibility including contrast and keyboard focus. | Contract must define focus ring, visible labels, contrast targets, and keyboard behavior. [VERIFIED: PROJETO.md] |
| VUX-05 | UI presents dates, times, and monetary values consistently in Brazilian business context. | Use `Intl.DateTimeFormat('pt-BR')` and `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. [VERIFIED: ECMAScript Intl API availability in Node/browser runtime] |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Workspace orchestration | Repository / Tooling | CI later | Root scripts coordinate app-specific scripts without coupling app code. [VERIFIED: npm workspaces docs] |
| Web app shell and visual contract demo | Browser / Client | API for live status | The browser owns UI rendering and interaction; it should call API for live foundation state. [VERIFIED: Vite/React docs] |
| Health and foundation write/read API | API / Backend | Database | Express owns request handling, error sanitization, logging, and Prisma access. [VERIFIED: Express docs] |
| Prisma schema, migration, seed | Database / Storage | API | Prisma owns schema history and seed execution; API consumes generated client. [VERIFIED: Prisma docs] |
| Docker local run | Local infrastructure | API/web/db | Compose owns local service startup, dependency order, ports, and healthchecks. [VERIFIED: Docker docs] |
| Visual contract documentation | Documentation / Design system | Browser CSS | Contract is a planning/design artifact plus initial CSS tokens consumed by web. [VERIFIED: PROJETO.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 19.2.7 [VERIFIED: npm registry] | UI rendering | Locked frontend stack and official React TS docs cover TS usage. [CITED: https://react.dev/learn/typescript] |
| `react-dom` | 19.2.7 [VERIFIED: npm registry] | Browser DOM renderer | Required React web runtime. [CITED: https://react.dev/learn/typescript] |
| `vite` [WARNING: flagged as suspicious - verify before using.] | 8.1.4 [VERIFIED: npm registry] | Web dev/build tool | Vite officially supports `react-ts` scaffolding and requires Node 20.19+ or 22.12+. [CITED: https://vite.dev/guide/] |
| `@vitejs/plugin-react` [WARNING: flagged as suspicious - verify before using.] | 6.0.3 [VERIFIED: npm registry] | React plugin for Vite | Official plugin enables Fast Refresh and automatic JSX runtime. [CITED: https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md] |
| `typescript` [WARNING: flagged as suspicious - verify before using.] | 7.0.2 [VERIFIED: npm registry] | Static typing | Required by locked TypeScript stack and eslint setup. [CITED: https://typescript-eslint.io/getting-started/] |
| `express` | 5.2.1 [VERIFIED: npm registry] | API server | Locked backend stack; official docs now show Express v5 with TypeScript guidance. [CITED: https://expressjs.com/en/starter/installing/] |
| `prisma` | 7.8.0 [VERIFIED: npm registry] | Migration and ORM CLI | Official Prisma v7 docs use `prisma.config.ts`, migrations, and explicit seed. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding] |
| `@prisma/client` | 7.8.0 [VERIFIED: npm registry] | Generated DB client | Runtime client paired with Prisma schema/migrations. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/getting-started] |
| `dotenv` | 17.4.2 [VERIFIED: npm registry] | Local env loading | Prisma docs use dotenv loading for runtime env files. [CITED: https://www.prisma.io/docs/orm/more/dev-environment/environment-variables] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cors` | 2.8.6 [VERIFIED: npm registry] | CORS headers for browser/API local dev | Use with explicit local origins; CORS is not authorization. [CITED: https://expressjs.com/en/resources/middleware/cors/] |
| `helmet` [WARNING: flagged as suspicious - verify before using.] | 8.3.0 [VERIFIED: npm registry] | Security headers | Use globally in API. [CITED: http://helmet.js.org/] |
| `pino` | 10.3.1 [VERIFIED: npm registry] | Structured JSON logger | Use as base logger. [CITED: https://github.com/pinojs/pino] |
| `pino-http` | 11.0.0 [VERIFIED: npm registry] | HTTP request logging | Use for API request logs, without request body logging. [CITED: https://github.com/pinojs/pino-http] |
| `tsx` [WARNING: flagged as suspicious - verify before using.] | 4.23.1 [VERIFIED: npm registry] | Run TS scripts in dev | Use for API dev command and Prisma seed. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding] |
| `vitest` [WARNING: flagged as suspicious - verify before using.] | 4.1.10 [VERIFIED: npm registry] | Unit/integration test runner | Use for web and API tests. [CITED: https://vitest.dev/guide/] |
| `@testing-library/react` | 16.3.2 [VERIFIED: npm registry] | React component tests | Use for first UI interaction test. [CITED: https://testing-library.com/docs/react-testing-library/intro/] |
| `@testing-library/dom` | 10.4.1 [VERIFIED: npm registry] | DOM queries peer dependency | Required by Testing Library React. [CITED: https://testing-library.com/docs/react-testing-library/intro/] |
| `@testing-library/jest-dom` | 6.9.1 [VERIFIED: npm registry] | DOM assertions for Vitest | Use `@testing-library/jest-dom/vitest`. [CITED: https://github.com/testing-library/jest-dom] |
| `jsdom` | 29.1.1 [VERIFIED: npm registry] | Browser-like test environment | Use for React component tests. [VERIFIED: npm registry] |
| `eslint` [WARNING: flagged as suspicious - verify before using.] | 10.7.0 [VERIFIED: npm registry] | Lint runner | Use flat config. [CITED: https://eslint.org/docs/latest/use/getting-started] |
| `@eslint/js` | 10.0.1 [VERIFIED: npm registry] | ESLint JS recommended config | Use in root flat config. [CITED: https://typescript-eslint.io/getting-started/] |
| `typescript-eslint` [WARNING: flagged as suspicious - verify before using.] | 8.64.0 [VERIFIED: npm registry] | TypeScript lint config/parser/plugin bundle | Use recommended config initially. [CITED: https://typescript-eslint.io/getting-started/] |
| `prettier` [WARNING: flagged as suspicious - verify before using.] | 3.9.5 [VERIFIED: npm registry] | Formatter | Install exact and use `prettier . --check`. [CITED: https://prettier.io/docs/install] |
| `eslint-config-prettier` | 10.1.8 [VERIFIED: npm registry] | Disable ESLint rules conflicting with Prettier | Use after ESLint configs. [CITED: https://prettier.io/docs/install] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| npm workspaces | pnpm or Turborepo | Locked Phase 1 decision prefers npm to avoid extra package-manager risk. [VERIFIED: 01-CONTEXT.md] |
| Vitest | Jest | Vitest is Vite-native and also works for backend code; Jest adds duplicate transform/config surface for Phase 1. [CITED: https://vitest.dev/guide/] |
| CSS variables and plain CSS | UI kit such as MUI/Chakra | Plain tokens keep Phase 1 small; UI kit can be reconsidered only when real component complexity appears. [VERIFIED: 01-CONTEXT.md] |
| Pino | Winston or console logging | Pino gives structured JSON logs with low overhead and request logger support. [CITED: https://github.com/pinojs/pino] |

**Installation:**

```bash
npm install -w apps/web react react-dom
npm install -w apps/api express @prisma/client dotenv cors helmet pino pino-http
npm install -D typescript vite @vitejs/plugin-react @types/node @types/express @types/cors @types/react @types/react-dom prisma tsx vitest @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom eslint @eslint/js typescript-eslint prettier eslint-config-prettier
```

**Version verification:** Versions above were checked with `npm view <package> version` on 2026-07-14. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `react` | npm | 14 yrs | 143M/wk | github.com/facebook/react | OK | Approved |
| `react-dom` | npm | 12 yrs | 112M/wk | github.com/facebook/react | OK | Approved |
| `@types/react` | npm | 10 yrs | 105M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| `@types/react-dom` | npm | 10 yrs | 85M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| `vite` | npm | 6 yrs | 117M/wk | github.com/vitejs/vite | SUS | Flagged - planner must add checkpoint |
| `@vitejs/plugin-react` | npm | 4 yrs | 54M/wk | github.com/vitejs/vite-plugin-react | SUS | Flagged - planner must add checkpoint |
| `typescript` | npm | 13 yrs | 212M/wk | github.com/microsoft/TypeScript | SUS | Flagged - planner must add checkpoint |
| `express` | npm | 15 yrs | 106M/wk | github.com/expressjs/express | OK | Approved |
| `@types/express` | npm | 10 yrs | 44M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| `@types/node` | npm | 10 yrs | 287M/wk | github.com/DefinitelyTyped/DefinitelyTyped | SUS | Flagged - planner must add checkpoint |
| `prisma` | npm | 10 yrs | 13M/wk | github.com/prisma/prisma | OK | Approved |
| `@prisma/client` | npm | 6 yrs | 13M/wk | github.com/prisma/prisma | OK | Approved |
| `tsx` | npm | 10 yrs | 71M/wk | github.com/privatenumber/tsx | SUS | Flagged - planner must add checkpoint |
| `dotenv` | npm | 13 yrs | 114M/wk | github.com/motdotla/dotenv | OK | Approved |
| `cors` | npm | 13 yrs | 49M/wk | github.com/expressjs/cors | OK | Approved |
| `@types/cors` | npm | 10 yrs | 22M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| `helmet` | npm | 14 yrs | 11M/wk | github.com/helmetjs/helmet | SUS | Flagged - planner must add checkpoint |
| `pino` | npm | 10 yrs | 36M/wk | github.com/pinojs/pino | OK | Approved |
| `pino-http` | npm | 10 yrs | 4.6M/wk | github.com/pinojs/pino-http | OK | Approved |
| `vitest` | npm | 4 yrs | 72M/wk | github.com/vitest-dev/vitest | SUS | Flagged - planner must add checkpoint |
| `@testing-library/react` | npm | 7 yrs | 44M/wk | github.com/testing-library/react-testing-library | OK | Approved |
| `@testing-library/dom` | npm | 7 yrs | 43M/wk | github.com/testing-library/dom-testing-library | OK | Approved |
| `@testing-library/jest-dom` | npm | 7 yrs | 50M/wk | github.com/testing-library/jest-dom | OK | Approved |
| `jsdom` | npm | 14 yrs | 61M/wk | github.com/jsdom/jsdom | OK | Approved |
| `eslint` | npm | 13 yrs | 133M/wk | github.com/eslint/eslint | SUS | Flagged - planner must add checkpoint |
| `@eslint/js` | npm | 3 yrs | 119M/wk | github.com/eslint/eslint | OK | Approved |
| `typescript-eslint` | npm | 6 yrs | 74M/wk | github.com/typescript-eslint/typescript-eslint | SUS | Flagged - planner must add checkpoint |
| `prettier` | npm | 9 yrs | 91M/wk | github.com/prettier/prettier | SUS | Flagged - planner must add checkpoint |
| `eslint-config-prettier` | npm | 9 yrs | 47M/wk | github.com/prettier/eslint-config-prettier | OK | Approved |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy check]
**Packages flagged as suspicious [SUS]:** `vite`, `@vitejs/plugin-react`, `typescript`, `@types/node`, `tsx`, `helmet`, `vitest`, `eslint`, `typescript-eslint`, `prettier`. [VERIFIED: package-legitimacy check]
**Postinstall scripts:** none were returned by `npm view <pkg> scripts.postinstall` for the recommended packages. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Developer
  |
  v
npm scripts / Docker Compose
  |
  +--> web service (Vite React)
  |      |
  |      v
  |   UI foundation screen
  |      |
  |      v
  |   fetch /api/foundation-check
  |
  +--> api service (Express)
  |      |
  |      +--> request logger -> routes -> global error middleware
  |      |
  |      v
  |   Prisma Client
  |
  +--> db service (PostgreSQL)
         |
         v
      Prisma migration + deterministic seed
```

### Recommended Project Structure

```text
apps/
  web/
    src/
      app/
      components/
      styles/
      test/
  api/
    src/
      config/
      http/
      logging/
      prisma/
      routes/
      test/
packages/
  shared/
    src/
prisma/
  migrations/
  schema.prisma
  seed.ts
docs/
  LOCAL_SETUP.md
  VISUAL_CONTRACT.md
```

Use `packages/shared` only for stable cross-tier types such as `HealthResponse`; do not move domain logic there in Phase 1. [VERIFIED: 01-CONTEXT.md]

### Pattern 1: Root Scripts as Contract

**What:** Root `package.json` owns `dev`, `build`, `lint`, `format:check`, `typecheck`, `test`, `db:migrate`, `db:seed`, and `verify`. [VERIFIED: 01-CONTEXT.md]
**When to use:** Every phase after Phase 1 should call the same root commands before completion. [VERIFIED: AGENTS.md]

```json
{
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "lint": "eslint .",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "vitest run",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "verify": "npm run format:check && npm run lint && npm run typecheck && npm run test"
  }
}
```

### Pattern 2: Express App Factory

**What:** Export `createApp()` separately from `server.ts` so tests can instantiate the app without binding a fixed port. [ASSUMED]
**When to use:** Health tests, error tests, and later route tests. [ASSUMED]

```typescript
// Source: Express error middleware shape from official docs
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp());
  app.get("/health", healthHandler);
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ status: "error", message: "Internal server error" });
  });
  return app;
}
```

### Pattern 3: Prisma v7 Config and Explicit Seed

**What:** Put schema, migrations path, seed command, and datasource URL in `prisma.config.ts`. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding]

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
```

### Anti-Patterns to Avoid

- **Business model creep:** Do not create `Tenant`, `User`, `Customer`, `Vehicle`, or auth tables in Phase 1; those belong to later phases. [VERIFIED: ROADMAP.md]
- **Notification-shaped UI:** Do not add a bell, inbox, message counter, send button, notification entity, or message queue. [VERIFIED: PROJETO.md]
- **Fake completion:** Do not mark Docker/Prisma/API/web complete without a command proving startup, migration, health, DB write/read, and UI interaction. [VERIFIED: AGENTS.md]
- **CORS as security:** CORS controls browser readability, not API authorization. [CITED: https://expressjs.com/en/resources/middleware/cors/]
- **Logging secrets:** Do not log request bodies, tokens, passwords, or env values; `pino-http` request body logging is disabled by default. [CITED: https://github.com/pinojs/pino-http]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workspace linking and script fanout | Custom shell script runner | npm workspaces | npm supports workspace linking and `npm run ... --workspaces`. [CITED: https://docs.npmjs.com/cli/v10/using-npm/workspaces/] |
| Schema migration history | Raw SQL files without migration tool | Prisma Migrate | Prisma creates versioned migration directories and syncs schema history. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/getting-started] |
| Dev seed runner | Custom ad hoc DB script | Prisma `db seed` | Prisma v7 explicitly invokes configured seed command. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding] |
| Frontend dev server | Custom bundler setup | Vite | Vite supports React TypeScript scaffolding and dev/build scripts. [CITED: https://vite.dev/guide/] |
| Error pipeline | Per-route try/catch responses | Express global error middleware | Express documents four-argument error middleware registered after routes. [CITED: https://expressjs.com/en/guide/error-handling/] |
| Formatting | ESLint style rules as formatter | Prettier | Prettier documents exact local install and `--check` for CI. [CITED: https://prettier.io/docs/install] |

**Key insight:** Phase 1 should standardize contracts and validation commands, not maximize framework abstraction. [VERIFIED: 01-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Overbuilding the Skeleton
**What goes wrong:** Phase 1 starts auth, tenant, customer, or dashboard feature work. [VERIFIED: ROADMAP.md]
**Why it happens:** A DB-backed slice is confused with a business module. [ASSUMED]
**How to avoid:** Use one neutral `FoundationCheck` table with fields such as `id`, `label`, `status`, `createdAt`, and `updatedAt`. [ASSUMED]
**Warning signs:** Models named `Tenant`, `User`, `Customer`, `Vehicle`, `Notification`, or `Quote` appear in Phase 1 migration. [VERIFIED: PROJETO.md]

### Pitfall 2: Docker Starts Before PostgreSQL Is Ready
**What goes wrong:** API crashes because Compose starts the DB container but PostgreSQL is not ready for connections. [CITED: https://docs.docker.com/compose/how-tos/startup-order/]
**Why it happens:** Compose starts dependencies in order but does not wait for readiness unless health conditions are used. [CITED: https://docs.docker.com/compose/how-tos/startup-order/]
**How to avoid:** Add DB `healthcheck` with `pg_isready` and API `depends_on: db: condition: service_healthy`. [CITED: https://docs.docker.com/compose/how-tos/startup-order/]
**Warning signs:** Intermittent `ECONNREFUSED` or Prisma connection failures during `docker compose up`. [ASSUMED]

### Pitfall 3: Env Files Become Secret Dumps
**What goes wrong:** `.env` is committed or docs include real passwords/tokens. [VERIFIED: AGENTS.md]
**Why it happens:** Local setup convenience overrides secret hygiene. [ASSUMED]
**How to avoid:** Commit `.env.example`; keep `.env` ignored; document sample local values only. [CITED: https://www.prisma.io/docs/orm/more/dev-environment/environment-variables]
**Warning signs:** `DATABASE_URL` with real credentials appears outside `.env.example`. [ASSUMED]

### Pitfall 4: Visual Contract Looks Like Marketing
**What goes wrong:** First UI uses hero sections, decorative cards, or oversized text. [VERIFIED: 01-CONTEXT.md]
**Why it happens:** SaaS foundations are treated as landing pages. [ASSUMED]
**How to avoid:** Create an operational shell with compact header, status strip, form, table/list, and state examples. [VERIFIED: 01-CONTEXT.md]
**Warning signs:** The first viewport is a brand hero instead of an operator workspace. [VERIFIED: 01-CONTEXT.md]

## Code Examples

### Health Handler With DB Connectivity

```typescript
import type { Request, Response } from "express";
import { prisma } from "../prisma/client";

export async function healthHandler(_req: Request, res: Response) {
  const startedAt = new Date().toISOString();
  await prisma.$queryRaw`SELECT 1`;
  res.json({
    status: "ok",
    database: "connected",
    checkedAt: startedAt
  });
}
```

### Foundation Write/Read Route

```typescript
app.post("/foundation-checks", async (req, res, next) => {
  try {
    const record = await prisma.foundationCheck.create({
      data: { label: String(req.body.label ?? "Local verification") }
    });
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});
```

### Visual Formatting Helpers

```typescript
export const formatDateTimeBr = (value: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));

export const formatCurrencyBr = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad hoc monorepo scripts | npm workspaces script fanout | npm workspaces documented in npm CLI v10 | Root validation can call workspace scripts consistently. [CITED: https://docs.npmjs.com/cli/v10/using-npm/workspaces/] |
| Legacy ESLint config | ESLint flat config with `typescript-eslint` | Current typescript-eslint docs | Start with `eslint.config.mjs`, not `.eslintrc`. [CITED: https://typescript-eslint.io/getting-started/] |
| Implicit Prisma seed during migrate reset | Explicit `prisma db seed` in Prisma v7 | Prisma v7 docs | Planner must add explicit seed command to verification. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding] |
| Compose dependency order only | `depends_on` with `service_healthy` | Current Docker docs | API should wait for PostgreSQL health, not just container start. [CITED: https://docs.docker.com/compose/how-tos/startup-order/] |

**Deprecated/outdated:**
- `.eslintrc` as the default new setup is outdated for this phase; use flat config. [CITED: https://typescript-eslint.io/getting-started/]
- Automatic notification concepts are out of scope, not merely postponed. [VERIFIED: PROJETO.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exporting an Express app factory is the best local pattern for tests. | Architecture Patterns | Tests may need minor restructuring if the planner chooses only black-box HTTP tests. |
| A2 | One neutral `FoundationCheck` table is the safest walking-skeleton model. | Summary / Pitfalls | Planner may choose a different neutral model, but must avoid business-domain creep. |
| A3 | Docker daemon unavailability is local-state related, not a project blocker. | Environment Availability | Planner may need a setup checkpoint if Docker Desktop is not running. |

## Open Questions

1. **Should the planner pin latest versions or previous stable minors for SUS packages?**
   - What we know: Package legitimacy flagged several widely used packages only because latest publishes are recent. [VERIFIED: package-legitimacy check]
   - What's unclear: Whether project policy prefers latest current releases or conservative older minors. [ASSUMED]
   - Recommendation: Add human checkpoint before install for each SUS package group, then pin exact versions in `package-lock.json`. [VERIFIED: package_legitimacy_protocol]

2. **Should `FoundationCheck` remain after Phase 1?**
   - What we know: It proves real DB write/read without implementing business modules. [VERIFIED: 01-CONTEXT.md]
   - What's unclear: Whether to keep it as diagnostics or remove it when real modules exist. [ASSUMED]
   - Recommendation: Mark it as internal/dev-only in docs and revisit after Phase 2. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm workspaces, Vite, Vitest, Prisma | yes | v22.14.0 | none needed |
| npm | package management | yes | 10.9.2 | none needed |
| Docker CLI | Compose local run | yes | 28.3.3 | Docker Desktop/daemon must be running |
| Docker Compose | local multi-service run | yes | v2.39.2-desktop.1 | none needed |
| Docker daemon | container execution | no | unavailable during probe | Start Docker Desktop before execution |
| PostgreSQL CLI `psql` | optional manual DB inspection | no | unavailable | Use PostgreSQL container and Prisma |
| git | version control | yes | 2.51.0.windows.1 | none needed |

**Missing dependencies with no fallback:**
- Docker daemon was not available during `docker info`; Phase 1 execution needs Docker Desktop or equivalent running. [VERIFIED: local probe]

**Missing dependencies with fallback:**
- `psql` is not installed locally; use Dockerized PostgreSQL and Prisma commands for Phase 1 verification. [VERIFIED: local probe]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 [VERIFIED: npm registry] |
| Config file | none yet - Wave 0 must create root `vitest.config.ts` or app-level configs [VERIFIED: repo scan] |
| Quick run command | `npm run verify` [VERIFIED: 01-CONTEXT.md] |
| Full suite command | `docker compose up --build` plus `npm run verify` plus `npm run db:migrate` plus `npm run db:seed` [VERIFIED: REQUIREMENTS.md] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FND-01 | Compose starts web, API, and DB | smoke | `docker compose up --build` | no - Wave 0 |
| FND-02 | Clean DB migration succeeds | integration | `npm run db:migrate` | no - Wave 0 |
| FND-03 | Lint, format, typecheck, tests pass | quality | `npm run verify` | no - Wave 0 |
| FND-04 | `/health` returns DB connected | integration | `npm run test --workspace apps/api` | no - Wave 0 |
| FND-05 | Error route returns sanitized JSON | integration | `npm run test --workspace apps/api` | no - Wave 0 |
| FND-06 | API emits structured request log | unit/integration | `npm run test --workspace apps/api` | no - Wave 0 |
| FND-07 | Seed creates deterministic row | integration | `npm run db:seed` | no - Wave 0 |
| FND-08 | Local setup docs commands run | manual smoke plus command checks | `npm run verify` | no - Wave 0 |
| VUX-01 | Visual contract exists and is referenced | docs check | `Test-Path docs/VISUAL_CONTRACT.md` | no - Wave 0 |
| VUX-02 | CSS tokens cover required primitives | unit/static check | `npm run test --workspace apps/web` | no - Wave 0 |
| VUX-03 | UI state examples render | component test | `npm run test --workspace apps/web` | no - Wave 0 |
| VUX-04 | Focus and labels visible in first UI | component/manual | `npm run test --workspace apps/web` | no - Wave 0 |
| VUX-05 | pt-BR date/currency helpers format correctly | unit | `npm run test --workspace apps/web` | no - Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run verify` [VERIFIED: AGENTS.md]
- **Per wave merge:** `docker compose up --build`, `npm run db:migrate`, `npm run db:seed`, `npm run verify` [VERIFIED: REQUIREMENTS.md]
- **Phase gate:** Docker Compose running, UI accessible, API health DB-connected, migration/seed run cleanly, root validation green. [VERIFIED: ROADMAP.md]

### Wave 0 Gaps

- [ ] `package.json` - root npm workspaces and validation scripts. [VERIFIED: repo scan]
- [ ] `apps/web/package.json` - Vite app scripts. [VERIFIED: repo scan]
- [ ] `apps/api/package.json` - Express app scripts. [VERIFIED: repo scan]
- [ ] `tsconfig.base.json`, app tsconfigs - strict TypeScript. [VERIFIED: 01-CONTEXT.md]
- [ ] `eslint.config.mjs`, `.prettierrc`, `.prettierignore`. [VERIFIED: repo scan]
- [ ] `vitest.config.ts` or app-level configs. [VERIFIED: repo scan]
- [ ] `compose.yaml`, `.env.example`, `prisma/schema.prisma`, `prisma/seed.ts`. [VERIFIED: repo scan]
- [ ] `docs/LOCAL_SETUP.md`, `docs/VISUAL_CONTRACT.md`. [VERIFIED: repo scan]

## Security Domain

Security enforcement is enabled because `.planning/config.json` does not set `security_enforcement: false`. [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

OWASP ASVS 5.0.0 is the referenced security verification standard for web application technical controls. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no for Phase 1 | Defer to Phase 2; do not create auth placeholders. [VERIFIED: ROADMAP.md] |
| V3 Session Management | no for Phase 1 | Defer refresh/session design to Phase 2. [VERIFIED: ROADMAP.md] |
| V4 Access Control | no for Phase 1 business data | Do not implement protected domain routes yet; keep backend validation principle documented. [VERIFIED: AGENTS.md] |
| V5 Input Validation | yes | Limit JSON body size, validate required foundation fields, and sanitize error responses. [CITED: https://expressjs.com/en/guide/error-handling/] |
| V6 Cryptography | limited | Do not store secrets; use env vars and `.env.example` only. [VERIFIED: AGENTS.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret leakage through errors | Information Disclosure | Global error middleware returns generic messages and logs sanitized context. [CITED: https://expressjs.com/en/guide/error-handling/] |
| Secret leakage through logs | Information Disclosure | Do not log request bodies or env values; keep `pino-http` body logging disabled. [CITED: https://github.com/pinojs/pino-http] |
| Cross-origin misunderstanding | Spoofing / Tampering | Configure CORS for browser local dev only; never treat CORS as auth. [CITED: https://expressjs.com/en/resources/middleware/cors/] |
| DB unavailable at startup | Denial of Service | Compose DB healthcheck and API dependency on `service_healthy`. [CITED: https://docs.docker.com/compose/how-tos/startup-order/] |

## Visual Contract Guidance

Use a utilitarian operations UI, not a marketing page. [VERIFIED: 01-CONTEXT.md] The first screen should look like a shop back-office work surface: compact header, system status strip, one action form, a small table/list, and visible loading/empty/error/success examples. [VERIFIED: 01-CONTEXT.md]

Prescribe these initial tokens in `docs/VISUAL_CONTRACT.md` and CSS variables: [VERIFIED: PROJETO.md]

- Palette: neutral work surface, dark readable text, one JO.IA brand accent, semantic status colors for success/warning/error/info. [VERIFIED: PROJETO.md]
- Typography: system sans stack, compact headings, no viewport-scaled font sizes. [VERIFIED: 01-CONTEXT.md]
- Spacing: 4px base grid with dense form/table spacing. [VERIFIED: 01-CONTEXT.md]
- Radius: 6px or less for operational controls and cards. [VERIFIED: 01-CONTEXT.md]
- Components: buttons, inputs, labels, table rows, filters, modals, status badges, skeletons, empty states, success/error banners, destructive confirmation. [VERIFIED: PROJETO.md]
- Accessibility: visible focus ring, label text for inputs, contrast review, keyboard-operable controls. [VERIFIED: PROJETO.md]
- Locale: dates/times and money use Brazilian Portuguese formatting. [VERIFIED: REQUIREMENTS.md]

## Sources

### Primary (HIGH confidence)

- Local `AGENTS.md` - project constraints, stack, security, validation, notification prohibitions. [VERIFIED: codebase read]
- Local `.planning/REQUIREMENTS.md` - FND-01..FND-08 and VUX-01..VUX-05. [VERIFIED: codebase read]
- Local `.planning/ROADMAP.md` - Phase 1 boundary and success criteria. [VERIFIED: codebase read]
- Local `.planning/phases/01-funda-o-t-cnica-e-contrato-visual/01-CONTEXT.md` - locked Phase 1 decisions. [VERIFIED: codebase read]
- npm registry and GSD package-legitimacy seam - package versions, downloads, repos, postinstall, OK/SUS verdicts. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- Vite docs - React TypeScript scaffolding and Node requirements: https://vite.dev/guide/
- React docs - TypeScript and React type packages: https://react.dev/learn/typescript
- Express docs - install, TypeScript types, error middleware: https://expressjs.com/en/starter/installing/ and https://expressjs.com/en/guide/error-handling/
- Prisma docs - migrate, env vars, v7 seed config: https://www.prisma.io/docs/orm/prisma-migrate/getting-started and https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
- Vitest docs - install and backend applicability: https://vitest.dev/guide/
- Testing Library docs - React component testing and jest-dom Vitest setup: https://testing-library.com/docs/react-testing-library/intro/
- Docker docs - `depends_on`, `service_healthy`, and `healthcheck`: https://docs.docker.com/compose/how-tos/startup-order/
- OWASP ASVS project page - ASVS 5.0.0 basis for security verification: https://owasp.org/www-project-application-security-verification-standard/

### Tertiary (LOW confidence)

- Assumptions A1-A3 in the Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - current versions verified against npm, but several latest packages are SUS due recent publish dates. [VERIFIED: npm registry]
- Architecture: HIGH - phase boundary and stack are locked by local project docs. [VERIFIED: 01-CONTEXT.md]
- Pitfalls: HIGH - notification, validation, Docker, Prisma, and visual-contract risks are grounded in project docs and official docs. [VERIFIED: PROJETO.md]

**Research date:** 2026-07-14 [VERIFIED: local system date]
**Valid until:** 2026-08-13 for stack guidance; re-check package versions before install because Node tooling is fast-moving. [ASSUMED]
