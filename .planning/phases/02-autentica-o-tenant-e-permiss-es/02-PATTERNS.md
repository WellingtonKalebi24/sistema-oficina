# Phase 02: Autenticacao, Tenant e Permissoes - Pattern Map

**Mapped:** 2026-07-18
**Files analyzed:** 35
**Analogs found:** 35 / 35

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | model | CRUD | `prisma/schema.prisma` | role-match |
| `prisma/migrations/*/migration.sql` | migration | CRUD | `prisma/migrations/20260714233600_init_foundation_check/migration.sql` | role-match |
| `prisma/seed.ts` | utility | CRUD | `prisma/seed.ts` | role-match |
| `apps/api/package.json` | config | dependency/config | `apps/api/package.json` | role-match |
| `apps/api/src/config/env.ts` | config | request-response | `apps/api/src/config/env.ts` | role-match |
| `apps/api/src/app.ts` | config | request-response | `apps/api/src/app.ts` | role-match |
| `apps/api/src/http/errors.ts` | utility | request-response | `apps/api/src/http/errors.ts` | role-match |
| `apps/api/src/db/prisma.ts` | utility | CRUD | `apps/api/src/db/prisma.ts` | role-match |
| `apps/api/src/auth/passwords.ts` | utility | transform | `apps/api/src/config/env.ts` | partial |
| `apps/api/src/auth/tokens.ts` | utility | transform | `apps/api/src/config/env.ts` | partial |
| `apps/api/src/auth/sessions.ts` | service | CRUD | `apps/api/src/http/routes/foundationChecks.ts` | partial |
| `apps/api/src/auth/passwordReset.ts` | service | event-driven | `prisma/seed.ts` | partial |
| `apps/api/src/permissions/permissions.ts` | utility | transform | `apps/api/src/config/env.ts` | partial |
| `apps/api/src/permissions/permissionService.ts` | service | CRUD | `apps/api/src/http/routes/foundationChecks.ts` | partial |
| `apps/api/src/audit/auditService.ts` | service | event-driven | `prisma/seed.ts` | partial |
| `apps/api/src/mail/emailSender.ts` | service | event-driven | `apps/api/src/logging/logger.ts` | partial |
| `apps/api/src/http/middleware/requireAuth.ts` | middleware | request-response | `apps/api/src/http/errors.ts` | role-match |
| `apps/api/src/http/middleware/requirePermission.ts` | middleware | request-response | `apps/api/src/http/errors.ts` | role-match |
| `apps/api/src/http/routes/bootstrap.ts` | route | request-response | `apps/api/src/http/routes/foundationChecks.ts` | role-match |
| `apps/api/src/http/routes/auth.ts` | route | request-response | `apps/api/src/http/routes/foundationChecks.ts` | role-match |
| `apps/api/src/http/routes/tenantSettings.ts` | route | CRUD | `apps/api/src/http/routes/foundationChecks.ts` | role-match |
| `apps/api/src/http/routes/users.ts` | route | CRUD | `apps/api/src/http/routes/foundationChecks.ts` | role-match |
| `apps/api/src/http/routes/roles.ts` | route | CRUD | `apps/api/src/http/routes/foundationChecks.ts` | role-match |
| `apps/api/src/test/auth-bootstrap.test.ts` | test | request-response | `apps/api/src/test/app.test.ts` | role-match |
| `apps/api/src/test/auth-sessions.test.ts` | test | request-response | `apps/api/src/test/app.test.ts` | role-match |
| `apps/api/src/test/permissions.test.ts` | test | request-response | `apps/api/src/test/app.test.ts` | role-match |
| `apps/api/src/test/tenant-isolation.test.ts` | test | CRUD | `apps/api/src/test/app.test.ts` | role-match |
| `apps/api/src/test/audit.test.ts` | test | event-driven | `apps/api/src/test/app.test.ts` | partial |
| `apps/api/src/test/testData.ts` | utility | CRUD | `apps/api/src/test/app.test.ts` | partial |
| `apps/web/package.json` | config | dependency/config | `apps/web/package.json` | role-match |
| `apps/web/src/api/auth.ts` | utility | request-response | `apps/web/src/api/foundationChecks.ts` | role-match |
| `apps/web/src/api/admin.ts` | utility | request-response | `apps/web/src/api/foundationChecks.ts` | role-match |
| `apps/web/src/auth/session.ts` | provider | event-driven | `apps/web/src/App.tsx` | partial |
| `apps/web/src/App.tsx` | component | request-response | `apps/web/src/App.tsx` | role-match |
| `apps/web/src/styles.css` | component | UI states | `apps/web/src/styles.css` | role-match |
| `apps/web/src/test/auth-ui.test.tsx` | test | request-response | `apps/web/src/test/App.test.tsx` | role-match |

## Pattern Assignments

### `prisma/schema.prisma` (model, CRUD)

**Analog:** `prisma/schema.prisma`

**Model pattern** (lines 1-14):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model FoundationCheck {
  id        String   @id @default(cuid())
  label     String   @unique
  status    String   @default("recorded")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
```

**Table mapping pattern** (line 14):
```prisma
  @@map("foundation_checks")
```

Apply to tenant/auth models with explicit `createdAt`, `updatedAt`, stable IDs, uniqueness constraints, and snake_case table maps. Add tenant-scoped relations and indexes for every operational model.

---

### `prisma/migrations/*/migration.sql` (migration, CRUD)

**Analog:** `prisma/migrations/20260714233600_init_foundation_check/migration.sql`

**Migration pattern:** use Prisma-generated, versioned migrations only. Do not hand-apply database changes outside `prisma migrate dev`.

---

### `prisma/seed.ts` (utility, CRUD)

**Analog:** `prisma/seed.ts`

**Imports and adapter pattern** (lines 1-4):
```typescript
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
```

**Typed writer seam** (lines 6-14):
```typescript
type FoundationCheckWriter = {
  foundationCheck: {
    upsert(args: {
      where: { label: string };
      create: { label: string; status: string };
      update: { status: string };
    }): Promise<unknown>;
  };
};
```

**Idempotent seed pattern** (lines 21-32):
```typescript
export async function seedFoundationChecks(prisma: FoundationCheckWriter): Promise<void> {
  await prisma.foundationCheck.upsert({
    where: { label: FOUNDATION_SEED.label },
    create: {
      label: FOUNDATION_SEED.label,
      status: FOUNDATION_SEED.status,
    },
    update: {
      status: FOUNDATION_SEED.status,
    },
  });
}
```

Use this pattern for deterministic development permissions and default role data. Seed by stable keys, not generated IDs.

---

### `apps/api/src/app.ts` (app composition, request-response)

**Analog:** `apps/api/src/app.ts`

**Imports pattern** (lines 1-11):
```typescript
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { DestinationStream, Logger } from "pino";

import { readApiEnv } from "./config/env.js";
import { getPrismaClient, type PrismaDatabase } from "./db/prisma.js";
import { createErrorHandler } from "./http/errors.js";
```

**Dependency injection pattern** (lines 13-25):
```typescript
export type CreateAppOptions = {
  enableTestRoutes?: boolean;
  logger?: Logger;
  logStream?: DestinationStream;
  prisma?: PrismaDatabase;
};

export function createApp(options: CreateAppOptions = {}): Express {
  const env = readApiEnv();
  const logger = options.logger ?? createLogger(options.logStream);
  const prisma = options.prisma ?? getPrismaClient(env.databaseUrl);
```

**Middleware and router mounting pattern** (lines 26-47):
```typescript
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.webOrigin,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
    }),
  );

  app.use(createHealthRouter(prisma));
  app.use(createFoundationChecksRouter(prisma));
```

Mount public health/bootstrap/auth routes before protected routers. Mount protected tenant/user/role routers after `requireAuth` and per-route `requirePermission`. Keep `createErrorHandler(logger)` last.

---

### `apps/api/src/http/errors.ts` (utility/middleware, request-response)

**Analog:** `apps/api/src/http/errors.ts`

**Error type pattern** (lines 1-13):
```typescript
import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import type { Logger } from "pino";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
```

**Async route wrapper** (lines 19-25):
```typescript
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
```

**Sanitized error response** (lines 27-43):
```typescript
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    void _next;

    if (error instanceof HttpError) {
      res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
      return;
    }

    logger.error({ err: error }, "Unhandled API error");
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  };
}
```

Extend with `unauthorized()` and `forbidden()` helpers. Keep auth failures generic and never include tokens, reset codes, passwords, or hashes in errors.

---

### `apps/api/src/db/prisma.ts` (utility, CRUD)

**Analog:** `apps/api/src/db/prisma.ts`

**Prisma adapter pattern** (lines 1-15):
```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export type PrismaDatabase = PrismaClient;

let singleton: PrismaClient | undefined;

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
}
```

Use `PrismaDatabase` as the injectable database type for auth, permission, tenant and audit services. Tests can pass the same client seam into `createApp`.

---

### `apps/api/src/config/env.ts` (config, request-response)

**Analog:** `apps/api/src/config/env.ts`

**Typed env pattern** (lines 1-6):
```typescript
export type ApiEnv = {
  databaseUrl: string;
  nodeEnv: "development" | "test" | "production";
  port: number;
  webOrigin: string;
};
```

**Required secret/config validation pattern** (lines 10-27):
```typescript
export function readApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const databaseUrl = source.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const portValue = source.API_PORT ?? source.PORT;
  const port = portValue ? Number(portValue) : DEFAULT_PORT;

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("API port must be a valid TCP port.");
  }
```

Add JWT issuer/audience/secret, access-token TTL, reset-code TTL, SMTP config, and optional rate-limit config here. Fail fast for required production secrets.

---

### `apps/api/src/http/routes/*.ts` (route, request-response/CRUD)

**Analog:** `apps/api/src/http/routes/foundationChecks.ts`

**Router factory and imports pattern** (lines 1-9):
```typescript
import { Router } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { asyncHandler, badRequest } from "../errors.js";

const MAX_LABEL_LENGTH = 120;
```

**GET list pattern** (lines 15-25):
```typescript
  router.get(
    "/foundation-checks",
    asyncHandler(async (_req, res) => {
      const rows = await prisma.foundationCheck.findMany({
        orderBy: { createdAt: "desc" },
      });

      res.json({
        data: rows.map(serializeFoundationCheck),
      });
    }),
  );
```

**POST create pattern** (lines 27-43):
```typescript
  router.post(
    "/foundation-checks",
    asyncHandler(async (req, res) => {
      const label = parseLabel(req.body);
      const record = await prisma.foundationCheck.create({
        data: {
          label,
          status: "recorded",
        },
      });

      res.status(201).json({
        data: serializeFoundationCheck(record),
      });
    }),
  );
```

**Validation helper pattern** (lines 47-61):
```typescript
function parseLabel(body: unknown): string {
  if (!body || typeof body !== "object" || !("label" in body)) {
    throw badRequest("label is required.");
  }

  const label = String((body as { label: unknown }).label).trim();

  if (!label) {
    throw badRequest("label is required.");
  }
```

Apply to `bootstrap.ts`, `auth.ts`, `tenantSettings.ts`, `users.ts`, and `roles.ts`: export `createXRouter(prisma)` factory, wrap async handlers, validate request bodies at the boundary, return `{ data: ... }`, and serialize Date values to ISO strings.

---

### `apps/api/src/auth/*.ts`, `apps/api/src/permissions/*.ts`, `apps/api/src/audit/*.ts`, `apps/api/src/mail/*.ts` (service/utility)

**Analogs:** `apps/api/src/db/prisma.ts`, `apps/api/src/http/routes/foundationChecks.ts`, `prisma/seed.ts`, `apps/api/src/logging/logger.ts`

**Service dependency pattern:** accept `PrismaDatabase` or narrow typed writer/reader interfaces instead of importing a singleton directly. Copy the writer seam from `prisma/seed.ts` lines 6-14 for focused unit tests.

**CRUD call pattern:** copy `findMany/create/upsert` Prisma calls from `foundationChecks.ts` lines 17-37 and `seed.ts` lines 21-32.

**Logging redaction pattern** from `apps/api/src/logging/logger.ts` (lines 3-15):
```typescript
export function createLogger(stream?: DestinationStream): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
      base: {
        service: "joia-api",
      },
      redact: {
        paths: ["req.headers.authorization", "req.headers.cookie"],
        remove: true,
      },
```

Auth-specific services have no exact local analog. Use the researched security patterns for Argon2id hashing, jose JWT signing/verification, refresh-token hashing/rotation, permission overrides, and SMTP/fake email adapter. Preserve local conventions: typed functions, injectable dependencies, no default singleton imports in testable logic, and sanitized errors.

---

### `apps/api/src/http/middleware/requireAuth.ts` and `requirePermission.ts` (middleware, request-response)

**Analog:** `apps/api/src/http/errors.ts`

**Middleware signature source** (lines 1, 19-25):
```typescript
import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
```

Build middleware as `(req, res, next) => void | Promise<void>` wrapped with `asyncHandler` when database/token checks are async. On failure call `next(new HttpError(401, "..."))` or `next(new HttpError(403, "..."))`; do not send responses directly from multiple places.

---

### `apps/api/src/test/*.test.ts` (test, request-response/CRUD/event-driven)

**Analog:** `apps/api/src/test/app.test.ts`

**Integration server setup** (lines 1-37):
```typescript
import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
```

**Injected app under test** (lines 39-58):
```typescript
beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;

  server = createServer(
    createApp({
      enableTestRoutes: true,
      logStream,
      prisma,
    }),
  );

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
```

**Cleanup pattern** (lines 60-78):
```typescript
beforeEach(async () => {
  logLines.length = 0;
  await prisma.foundationCheck.deleteMany();
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
```

**HTTP assertion pattern** (lines 88-123):
```typescript
const createResponse = await fetch(`${baseUrl}/foundation-checks`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({ label: "API persistence proof" }),
});

expect(createResponse.status).toBe(201);
```

**Security redaction assertion pattern** (lines 125-155):
```typescript
expect(response.status).toBe(500);
expect(bodyText).toContain("Internal server error");
expect(bodyText).not.toContain("forced failure");
expect(bodyText).not.toContain("DATABASE_URL");
expect(bodyText).not.toContain("Error:");
```

Use this for `auth-bootstrap`, `auth-sessions`, `permissions`, `tenant-isolation`, and `audit` tests. Add broader cleanup for tenant/user/session/permission/audit tables. Keep two-tenant fixtures in `testData.ts`.

---

### `apps/api/src/test/prisma-baseline.test.ts` (test, CRUD/schema)

**Analog:** `apps/api/src/test/prisma-baseline.test.ts`

**Schema inspection pattern** (lines 1-38):
```typescript
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(new URL("../../../../prisma/schema.prisma", import.meta.url));

describe("Prisma foundation baseline", () => {
  it("keeps the schema scoped to neutral foundation diagnostics", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toMatch(/model\s+FoundationCheck\b/);
```

Update this baseline or replace with Phase 2 schema assertions so identity models are expected and out-of-scope business/communication models remain absent.

---

### `apps/web/src/api/auth.ts` and `apps/web/src/api/admin.ts` (utility, request-response)

**Analog:** `apps/web/src/api/foundationChecks.ts`

**Typed response pattern** (lines 1-13):
```typescript
export type FoundationCheck = {
  id: string;
  label: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type FoundationCheckResponse = {
  data: FoundationCheck;
};
```

**API base and fetch error pattern** (lines 15-26):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function listFoundationChecks(): Promise<FoundationCheck[]> {
  const response = await fetch(`${API_BASE_URL}/foundation-checks`);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar os registros de fundacao.");
  }
```

**POST JSON pattern** (lines 28-45):
```typescript
export async function createFoundationCheck(label: string): Promise<FoundationCheck> {
  const response = await fetch(`${API_BASE_URL}/foundation-checks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label }),
  });
```

For auth/admin clients, add bearer token headers through a single helper. Keep response types local unless shared types already reduce duplication.

---

### `apps/web/src/App.tsx` and `apps/web/src/auth/session.ts` (component/provider, request-response/event-driven)

**Analog:** `apps/web/src/App.tsx`

**State model pattern** (lines 1-19):
```typescript
import { FormEvent, useEffect, useMemo, useState } from "react";

type LoadState = "idle" | "loading" | "ready" | "error";
type SubmitState = "idle" | "saving" | "success" | "error";

export function App() {
  const [checks, setChecks] = useState<FoundationCheck[]>([]);
  const [label, setLabel] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
```

**Effect cancellation pattern** (lines 21-50):
```typescript
useEffect(() => {
  let active = true;

  async function loadChecks() {
    setLoadState("loading");

    try {
      const rows = await listFoundationChecks();

      if (!active) {
        return;
      }
```

**Submit state pattern** (lines 57-79):
```typescript
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const cleanLabel = label.trim();

  if (!cleanLabel) {
    setSubmitState("error");
    setMessage("Informe uma etiqueta antes de registrar.");
    return;
  }

  setSubmitState("saving");
```

**Operational shell pattern** (lines 81-150):
```tsx
return (
  <main className="app-shell">
    <header className="topbar" aria-label="Cabecalho do workspace">
      <div>
        <p className="eyebrow">JO.IA Oficina</p>
        <h1>Fundacao tecnica</h1>
      </div>
      <div className="status-strip" aria-label="Estado do sistema">
```

Use this as the visual baseline for login, authenticated shell, tenant settings, user management and permission management. Replace the foundation content, but keep compact operational layout, explicit status states, accessible labels, and table-first admin screens.

---

### `apps/web/src/styles.css` (component styling, UI states)

**Analog:** `apps/web/src/styles.css`

**Design tokens** (lines 1-25):
```css
:root {
  color-scheme: light;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  --color-bg: #f4f7f6;
  --color-surface: #ffffff;
  --color-surface-muted: #eef3f1;
```

**Compact shell/panel pattern** (lines 50-105):
```css
.app-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: var(--space-5) 0 40px;
}

.topbar,
.panel,
.state-card {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}
```

**Form and button pattern** (lines 126-191):
```css
.field {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text);
  font-size: 0.9rem;
  font-weight: 700;
}

input {
  width: 100%;
  min-height: 42px;
```

**Table and state pattern** (lines 210-284):
```css
.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
  font-size: 0.88rem;
}
```

Keep 8px-or-less radii, operational density, visible labels, responsive grid collapse, and status/empty/error states. Avoid landing-page/marketing layout.

---

### `apps/web/src/test/auth-ui.test.tsx` (test, request-response)

**Analog:** `apps/web/src/test/App.test.tsx`

**JSDOM and Testing Library pattern** (lines 1-8):
```typescript
// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
```

**Fetch mock pattern** (lines 13-37):
```typescript
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
```

**Accessible UI assertions** (lines 40-80):
```typescript
render(<App />);

expect(await screen.findByText("Nenhum registro ainda")).toBeInTheDocument();

fireEvent.change(screen.getByLabelText("Etiqueta da verificacao"), {
  target: { value: "web-api-db" },
});
fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
```

Test login form states, blocked/admin menu visibility, tenant settings form behavior, and permission screens with mocked API responses. Do not treat UI tests as backend authorization proof.

## Shared Patterns

### Express Router Factories
**Source:** `apps/api/src/http/routes/foundationChecks.ts`  
**Apply to:** all API route files
```typescript
export function createFoundationChecksRouter(prisma: PrismaDatabase): Router {
  const router = Router();
  // routes...
  return router;
}
```

### Async Error Handling
**Source:** `apps/api/src/http/errors.ts`  
**Apply to:** all async route handlers and async auth/permission middleware
```typescript
router.post(
  "/foundation-checks",
  asyncHandler(async (req, res) => {
    // validate, write, serialize
  }),
);
```

### Sanitized API Errors
**Source:** `apps/api/src/http/errors.ts`  
**Apply to:** auth, password reset, session, permission, tenant routes
```typescript
if (error instanceof HttpError) {
  res.status(error.statusCode).json({
    status: "error",
    message: error.message,
  });
  return;
}
```

### Dependency Injection
**Source:** `apps/api/src/app.ts`, `apps/api/src/db/prisma.ts`  
**Apply to:** app composition, services, tests
```typescript
const prisma = options.prisma ?? getPrismaClient(env.databaseUrl);
app.use(createFoundationChecksRouter(prisma));
```

### Request Log Redaction
**Source:** `apps/api/src/logging/logger.ts`  
**Apply to:** auth/session routes and new logger-sensitive tests
```typescript
redact: {
  paths: ["req.headers.authorization", "req.headers.cookie"],
  remove: true,
},
```

### API Response Shape
**Source:** `apps/api/src/http/routes/foundationChecks.ts`, `apps/web/src/api/foundationChecks.ts`  
**Apply to:** all JSON API clients
```typescript
res.json({
  data: rows.map(serializeFoundationCheck),
});
```

### API Integration Tests
**Source:** `apps/api/src/test/app.test.ts`  
**Apply to:** all Phase 2 API tests
```typescript
server = createServer(
  createApp({
    enableTestRoutes: true,
    logStream,
    prisma,
  }),
);
```

### Web Loading And Submit States
**Source:** `apps/web/src/App.tsx`  
**Apply to:** login, tenant settings, users, roles, permissions screens
```typescript
const [loadState, setLoadState] = useState<LoadState>("idle");
const [submitState, setSubmitState] = useState<SubmitState>("idle");
const [message, setMessage] = useState("Pronto para validar a fundacao tecnica.");
```

### Web Test Cleanup
**Source:** `apps/web/src/test/App.test.tsx`  
**Apply to:** auth UI tests
```typescript
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});
```

## No Exact Analog Found

The skeleton has no existing authentication, tenancy, authorization, audit, email, or React routing implementation. These files have only role-level or partial analogs and must combine local code style with `02-RESEARCH.md` security patterns:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/api/src/auth/passwords.ts` | utility | transform | No password hashing code exists yet. |
| `apps/api/src/auth/tokens.ts` | utility | transform | No JWT/token code exists yet. |
| `apps/api/src/auth/sessions.ts` | service | CRUD | No persisted session model/service exists yet. |
| `apps/api/src/auth/passwordReset.ts` | service | event-driven | No reset-token or email-code lifecycle exists yet. |
| `apps/api/src/permissions/permissions.ts` | utility | transform | No permission constants/resolver exist yet. |
| `apps/api/src/permissions/permissionService.ts` | service | CRUD | No role/permission persistence exists yet. |
| `apps/api/src/audit/auditService.ts` | service | event-driven | No audit writer exists yet. |
| `apps/api/src/mail/emailSender.ts` | service | event-driven | No mail adapter exists yet. |
| `apps/api/src/http/middleware/requireAuth.ts` | middleware | request-response | No auth middleware exists yet. |
| `apps/api/src/http/middleware/requirePermission.ts` | middleware | request-response | No permission guard exists yet. |
| `apps/web/src/auth/session.ts` | provider | event-driven | No auth state provider exists yet. |

## Metadata

**Analog search scope:** `apps/api/src`, `apps/web/src`, `prisma`, root package/workspace configs  
**Files scanned:** 27 repository files plus 3 phase artifacts  
**Pattern extraction date:** 2026-07-18  
**Project instructions:** `AGENTS.md` requires backend authorization, tenant isolation, Prisma migrations, auditability, executable validation, and React/Vite/TypeScript + Node/Express/TypeScript/PostgreSQL/Prisma/Docker Compose.  
**Project skills:** `.agents/skills` not present. `.codex/skills` contains GSD workflow skills, but `AGENTS.md` states no project-specific skills are configured.
