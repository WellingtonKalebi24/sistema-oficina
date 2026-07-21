# Phase 03: Clientes e Veiculos - Research

**Researched:** 2026-07-20
**Domain:** Tenant-scoped customer and vehicle CRUD, Brazilian validation, audit, and compact operational UI
**Confidence:** HIGH for codebase patterns; MEDIUM for official framework docs; LOW where Brazilian vehicle-format details rely on non-official or mixed sources.

## User Constraints

- Phase goal: Permitir gestao segura da base de clientes e veiculos da oficina. [VERIFIED: .planning/ROADMAP.md]
- Requirements in scope: CAV-01 through CAV-09. [VERIFIED: .planning/REQUIREMENTS.md]
- Use React, Vite, TypeScript, Node.js, Express, PostgreSQL, Prisma and Docker Compose; stack changes require a recorded technical decision. [VERIFIED: AGENTS.md]
- Authorization must be enforced in the backend; hiding frontend buttons is not a substitute. [VERIFIED: AGENTS.md]
- All operational records must be filtered and validated by the authenticated tenant. [VERIFIED: AGENTS.md]
- The system must not send messages, open WhatsApp automatically, or record communication delivery/read state. [VERIFIED: AGENTS.md]
- Critical actions must write audit records with tenant, user, action, entity, record, timestamp and relevant values without storing secrets. [VERIFIED: AGENTS.md]
- Phases cannot finish with lint, type check, tests, migrations, or critical validation failing. [VERIFIED: AGENTS.md]
- Completion must be proven by executable verification, not by created files or visible screens alone. [VERIFIED: AGENTS.md]
- No CONTEXT.md exists for Phase 03, so there are no additional locked/discretion/deferred decisions to copy. [VERIFIED: gsd init.phase-op]

## Summary

Phase 03 should add first-class `Customer`, `Vehicle`, link/history, permission, API, and UI modules without changing the established stack. Phase 2 already provides the protected route seam: public health/bootstrap/auth/foundation routes mount first, then `requireAuth`, then protected routers gated by `requirePermission`; tenant-sensitive routes use `auth.tenantId` and write audit records inside transactions. [VERIFIED: apps/api/src/app.ts] [VERIFIED: apps/api/src/http/middleware/requireAuth.ts] [VERIFIED: apps/api/src/http/middleware/requirePermission.ts] [VERIFIED: apps/api/src/audit/auditService.ts]

The data model should store normalized searchable fields separately from display fields: `documentNormalized`, `phoneNormalized`, `plateNormalized`, and `vinNormalized`. Use soft delete with `deletedAt`/`deletedByUserId`, preserve records for later reception/quotes/OS history, and enforce active-only duplicates with hand-authored PostgreSQL partial unique indexes in the Prisma migration SQL because active-row uniqueness with `deleted_at IS NULL` is a database predicate concern. [VERIFIED: prisma/schema.prisma] [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] [CITED: https://github.com/prisma/prisma/issues/22567]

**Primary recommendation:** Implement a vertical slice: migration + permission seed, customer/vehicle validators and services, protected routers, API integration tests, typed web client, compact customers/vehicles UI, and UI tests before running `npm run db:migrate` and `npm run verify`. [VERIFIED: package.json] [VERIFIED: apps/web/src/App.tsx]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAV-01 | User can create, edit, list and soft-delete customers within the tenant. | Tenant-scoped `Customer` model, `customers.*` permissions, soft delete, audit. [VERIFIED: .planning/REQUIREMENTS.md] |
| CAV-02 | User can create, edit, list and soft-delete vehicles within the tenant. | Tenant-scoped `Vehicle` model, `vehicles.*` permissions, soft delete, audit. [VERIFIED: .planning/REQUIREMENTS.md] |
| CAV-03 | User can link one or more vehicles to a customer. | Use `Vehicle.customerId` for one current owner/contact per vehicle in MVP; add `CustomerVehicleLink` only if ownership history must preserve multiple contacts now. [ASSUMED] |
| CAV-04 | User can search customers by name, phone and document. | Store normalized phone/document fields and query with tenant + `deletedAt: null`. [CITED: https://zod.dev/api] |
| CAV-05 | User can search vehicles by plate and related customer. | Store `plateNormalized`, include customer summary, filter by `customerId` and tenant. [ASSUMED] |
| CAV-06 | System prevents duplicate customer or vehicle records according to configured unique fields. | Enforce document/phone/plate/VIN duplicates at service level and partial unique DB indexes for active rows. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |
| CAV-07 | User can view basic customer and vehicle history. | Add append-only `CustomerVehicleHistoryEvent` for CRUD/link events now; later phases can append reception/quote/OS events. [ASSUMED] |
| CAV-08 | Customer and vehicle changes are audited. | Reuse `writeAuditLog` and sanitize metadata; write inside same transaction as mutation. [VERIFIED: apps/api/src/audit/auditService.ts] |
| CAV-09 | Customer and vehicle data cannot cross tenant boundaries. | Every route/service query must include `tenantId: auth.tenantId`; tests must attempt cross-tenant read/update/link/delete. [VERIFIED: apps/api/src/test/tenant-isolation.test.ts] |

## Project Constraints (from AGENTS.md)

- Keep the selected stack unless a technical decision records otherwise. [VERIFIED: AGENTS.md]
- Backend authorization is mandatory for protected behavior. [VERIFIED: AGENTS.md]
- Tenant isolation is a default data-access concern for operational records. [VERIFIED: AGENTS.md]
- No customer communication automation, notification center, WhatsApp integration, email integration, SMS, push, message queue, delivery tracking, or read tracking. [VERIFIED: AGENTS.md]
- Critical actions must be audited and must not store secrets. [VERIFIED: AGENTS.md]
- Quality gates include lint, type check, automated tests, migrations, and executable validation. [VERIFIED: AGENTS.md]
- Start direct implementation work through GSD execution workflows; this artifact is research-only. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Customer/vehicle persistence | Database / Storage | API / Backend | PostgreSQL owns durable tenant records, soft-delete state, foreign keys, and partial indexes. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |
| Tenant isolation | API / Backend | Database / Storage | Phase 2 derives tenant from authenticated session; API queries must inject `auth.tenantId`. [VERIFIED: apps/api/src/http/middleware/requireAuth.ts] |
| Permission enforcement | API / Backend | Browser / Client | `requirePermission` is authoritative; browser menu filtering is usability only. [VERIFIED: apps/api/src/http/middleware/requirePermission.ts] [VERIFIED: apps/web/src/auth/session.ts] |
| Duplicate prevention | Database / Storage | API / Backend | API can provide friendly errors, but DB partial unique indexes are the final active-record race guard. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |
| Brazilian input normalization | API / Backend | Browser / Client | Browser can format for convenience; API validators must normalize before persistence. [CITED: https://zod.dev/api] |
| Compact operational UI | Browser / Client | API / Backend | React shell renders filters/forms/tables; backend remains source of truth. [VERIFIED: docs/VISUAL_CONTRACT.md] |
| Audit trail | API / Backend | Database / Storage | Mutations write audit rows in transactions through `writeAuditLog`. [VERIFIED: apps/api/src/audit/auditService.ts] |

## Standard Stack

### Core

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@prisma/client` | 7.8.0 | Type-safe DB client for PostgreSQL models and transactions. | Already used by API tests and schema; stay on installed version. [VERIFIED: npm ls] |
| `prisma` | 7.8.0 | Migration generation and seed workflow. | Existing `npm run db:migrate` uses Prisma migrations. [VERIFIED: package.json] |
| `express` | 5.2.1 | Protected API routers and middleware. | Existing app uses Express routers, middleware, and error handler. [VERIFIED: apps/api/src/app.ts] |
| `zod` | 4.4.3 | Request validation and normalization. | Existing routes use `safeParse`; official docs support refinements/transforms. [VERIFIED: apps/api/src/http/routes/users.ts] [CITED: https://zod.dev/api] |
| `react` / `react-dom` | 19.2.7 | Customer/vehicle operational UI. | Existing web app uses React controlled forms and tables. [VERIFIED: apps/web/src/App.tsx] |
| `react-router` | 7.18.1 | Authenticated client-side navigation. | Existing shell wraps `BrowserRouter`; official docs describe BrowserRouter as History API routing. [VERIFIED: apps/web/src/App.tsx] [CITED: https://reactrouter.com/api/declarative-routers/BrowserRouter] |

### Supporting

| Library | Installed Version | Purpose | When to Use |
|---------|-------------------|---------|-------------|
| `vitest` | 4.1.10 | API and web automated tests. | Add customer/vehicle API integration tests and UI tests. [VERIFIED: npm ls] |
| `@testing-library/react` | 16.3.2 | UI behavior tests. | Mock typed API calls and assert compact screens, filters, forms, 403 states. [VERIFIED: apps/web/src/test/auth-ui.test.tsx] |
| `pino-http` | 11.0.0 | HTTP logging seam. | Keep existing app logger behavior; do not add feature-specific logging libraries. [VERIFIED: apps/api/src/app.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing Zod validators | New BR-specific validation package | Not recommended; Phase 3 can implement small CPF/CNPJ/plate/VIN normalizers without new package risk. [ASSUMED] |
| Existing React state/forms | React Hook Form | Not recommended for this phase; existing UI already uses controlled inputs and no dependency install is needed. [VERIFIED: apps/web/src/App.tsx] |
| Prisma schema-only uniqueness | Raw SQL partial unique indexes | Use raw SQL for active-only duplicate rules; Prisma schema alone does not model the soft-delete predicate. [CITED: https://github.com/prisma/prisma/issues/22567] |

**Installation:**

```bash
# No new packages recommended for Phase 03.
```

**Version verification:** Current installed stack was verified with `npm ls @prisma/client prisma zod express react react-dom react-router vitest @testing-library/react --depth=0 --workspaces --include-workspace-root`. Latest registry versions were checked with `npm view`; several latest releases are newer than installed versions, but Phase 03 should avoid package churn. [VERIFIED: npm registry] [VERIFIED: npm ls]

## Package Legitimacy Audit

No external package installation is recommended for Phase 03. Existing package legitimacy was still checked because the Standard Stack lists current dependencies. [VERIFIED: package-legitimacy seam]

| Package | Registry | Age Signal | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|------------|-----------|-------------|---------|-------------|
| `@prisma/client` | npm | Latest published 2026-07-20 | 14.9M/wk | github.com/prisma/prisma | SUS: too-new latest | Keep installed 7.8.0; no install |
| `prisma` | npm | Latest published 2026-07-20 | 14.9M/wk | github.com/prisma/prisma | SUS: too-new latest | Keep installed 7.8.0; no install |
| `zod` | npm | Latest published 2026-05-04 | 234M/wk | github.com/colinhacks/zod | OK | Approved existing dependency |
| `express` | npm | Latest published 2025-12-01 | 119M/wk | github.com/expressjs/express | OK | Approved existing dependency |
| `react` | npm | Latest published 2026-06-01 | 161M/wk | github.com/facebook/react | OK | Approved existing dependency |
| `react-dom` | npm | Latest published 2026-06-01 | 152M/wk | github.com/facebook/react | OK | Approved existing dependency |
| `react-router` | npm | Latest published 2026-07-08 | 50M/wk | github.com/remix-run/react-router | SUS: too-new latest | Keep installed 7.18.1; no install |
| `vitest` | npm | Latest published 2026-07-06 | 79M/wk | github.com/vitest-dev/vitest | SUS: too-new latest | Keep installed 4.1.10; no install |
| `@testing-library/react` | npm | Latest published 2026-01-19 | 47M/wk | github.com/testing-library/react-testing-library | OK | Approved existing dependency |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** latest `@prisma/client`, `prisma`, `react-router`, and `vitest` are flagged only because their latest releases are very recent; Phase 03 should not install or upgrade them.

## Architecture Patterns

### System Architecture Diagram

```text
Browser authenticated shell
  -> typed customers/vehicles API client
  -> Express protected routes mounted after requireAuth
  -> requirePermission(customers.* / vehicles.*)
  -> Zod validation + normalization
  -> service layer injects auth.tenantId into every query
  -> Prisma transaction
       -> Customer / Vehicle / HistoryEvent mutation
       -> writeAuditLog(...)
  -> PostgreSQL foreign keys + active-row partial unique indexes
  -> serialized DTO response
  -> compact table/filter/detail UI updates or 403 blocked state
```

### Recommended Project Structure

```text
apps/api/src/
├── customers/customerSchemas.ts        # Zod request schemas and normalizers
├── customers/customerService.ts        # tenant-scoped customer operations
├── customers/vehicleService.ts         # tenant-scoped vehicle operations
├── http/routes/customers.ts            # /customers routes
├── http/routes/vehicles.ts             # /vehicles routes
└── test/customer-vehicles.test.ts      # API CRUD/duplicates/audit/isolation

apps/web/src/
├── api/customers.ts                    # typed customer/vehicle client
├── customers/CustomersWorkspace.tsx    # compact UI module
└── test/customer-vehicles-ui.test.tsx  # UI filters/forms/403 flows
```

### Pattern 1: Tenant-Scoped Protected Router

**What:** Mount `createCustomersRouter(prisma)` after `requireAuth`; each route gates with `requirePermission(prisma, PERMISSIONS.customersRead)` or mutation-specific keys. [VERIFIED: apps/api/src/app.ts]

**When to use:** Every Phase 03 endpoint.

**Example:**

```typescript
router.get(
  "/customers",
  requirePermission(prisma, PERMISSIONS.customersRead),
  asyncHandler(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const customers = await prisma.customer.findMany({
      where: { tenantId: auth.tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    res.json({ data: customers.map(serializeCustomer) });
  }),
);
```

### Pattern 2: Mutate With Audit in One Transaction

**What:** Create/update/soft-delete/link and audit row should commit or fail together. [VERIFIED: apps/api/src/http/routes/users.ts] [VERIFIED: apps/api/src/audit/auditService.ts]

**When to use:** All CAV-01, CAV-02, CAV-03 and CAV-08 mutations.

**Example:**

```typescript
const customer = await prisma.$transaction(async (tx) => {
  const updated = await tx.customer.update({
    data: { name: parsed.data.name },
    where: { id: customerId, tenantId: auth.tenantId },
  });
  await writeAuditLog(tx as PrismaDatabase, {
    action: "customers.updated",
    entity: "customer",
    metadata: { fields: Object.keys(parsed.data).sort() },
    recordId: updated.id,
    tenantId: auth.tenantId,
    userId: auth.userId,
  });
  return updated;
});
```

### Pattern 3: Active-Only Duplicate Enforcement

**What:** API checks duplicates for friendly errors, but PostgreSQL partial unique indexes enforce active-row uniqueness. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html]

**When to use:** Customer document/phone and vehicle plate/VIN duplicate rules.

**Example migration SQL:**

```sql
CREATE UNIQUE INDEX "customers_tenant_document_active_key"
  ON "customers" ("tenant_id", "document_normalized")
  WHERE "deleted_at" IS NULL AND "document_normalized" IS NOT NULL;

CREATE UNIQUE INDEX "vehicles_tenant_plate_active_key"
  ON "vehicles" ("tenant_id", "plate_normalized")
  WHERE "deleted_at" IS NULL;
```

### Anti-Patterns to Avoid

- **Trusting query params for tenant:** Ignore `tenantId` input for operational CRUD; derive tenant from `req.auth`. [VERIFIED: apps/api/src/http/middleware/requireAuth.ts]
- **Hard-deleting customers/vehicles:** Soft delete preserves future history and audit continuity. [VERIFIED: .planning/ROADMAP.md]
- **Only checking duplicates in application code:** Concurrent requests can race; DB uniqueness must be final authority. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html]
- **Putting CPF/CNPJ/plate formatting only in the UI:** Backend validation and normalization are authoritative. [VERIFIED: AGENTS.md]
- **Expanding communications:** Do not add WhatsApp/email/SMS/customer-message buttons while creating customer records. [VERIFIED: docs/VISUAL_CONTRACT.md]

## Recommended Data Model

| Model | Key Fields | Notes |
|-------|------------|-------|
| `Customer` | `id`, `tenantId`, `name`, `document`, `documentNormalized`, `documentType`, `phone`, `phoneNormalized`, `email`, `notes`, `createdAt`, `updatedAt`, `deletedAt`, `deletedByUserId` | Customer document and phone are optional; active duplicates should be blocked only when normalized values exist. [ASSUMED] |
| `Vehicle` | `id`, `tenantId`, `customerId`, `plate`, `plateNormalized`, `vin`, `vinNormalized`, `brand`, `model`, `year`, `color`, `mileage`, `notes`, timestamps, soft delete fields | `customerId` required for MVP because CAV-03 requires linking vehicles to customers. [ASSUMED] |
| `CustomerVehicleHistoryEvent` | `id`, `tenantId`, `customerId`, `vehicleId`, `type`, `summary`, `metadata`, `createdByUserId`, `createdAt` | Append basic CRUD/link history now; later phases append reception/quote/OS events. [ASSUMED] |

**Prisma relation additions:** add `customers Customer[]` and `vehicles Vehicle[]` to `Tenant`; add optional audit/user relations only if needed by Prisma compile constraints. [VERIFIED: prisma/schema.prisma]

**Soft delete rule:** list/search/detail endpoints default to `deletedAt: null`; history endpoints may show soft-deleted related rows with a clear status. [ASSUMED]

## Permission Namespace Additions

Use granular, stable keys in `apps/api/src/permissions/permissions.ts`, seed them through `ALL_PERMISSIONS`, and include names/descriptions in `PERMISSION_DETAILS`. [VERIFIED: apps/api/src/permissions/permissions.ts] [VERIFIED: prisma/seed.ts]

| Key | Purpose |
|-----|---------|
| `customers.read` | list/search/view customer and customer history |
| `customers.create` | create customers |
| `customers.update` | edit customers and link customer metadata |
| `customers.delete` | soft-delete customers |
| `vehicles.read` | list/search/view vehicles and vehicle history |
| `vehicles.create` | create vehicles |
| `vehicles.update` | edit vehicles and customer link |
| `vehicles.delete` | soft-delete vehicles |

The default `admin` role should receive all new keys; the default `operator` role should receive at least `customers.read`, `customers.create`, `customers.update`, `vehicles.read`, `vehicles.create`, and `vehicles.update` if the MVP expects normal reception staff to maintain the base. [ASSUMED]

## Validation and Duplicate Rules

| Field | Normalize | Accept | Duplicate Rule |
|-------|-----------|--------|----------------|
| Customer name | trim/collapse spaces | 1..160 chars | no uniqueness; names collide naturally. [ASSUMED] |
| CPF | digits only | optional 11 digits | active unique per tenant when present. [CITED: https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf] |
| CNPJ | uppercase alphanumeric, strip punctuation | optional 14 positions | active unique per tenant when present; support alphanumeric CNPJ because Receita Federal rollout starts July 2026. [CITED: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico] |
| Phone | digits only | optional 10 or 11 Brazilian local/mobile digits; allow `+55` input but store canonical national digits. | active duplicate warning/block per tenant when configured; recommend block for MVP if phone is present. [ASSUMED] |
| Email | lowercase trim | optional `z.email()` | no uniqueness for MVP; families/fleets may share emails. [ASSUMED] |
| Plate | uppercase, strip hyphen/space | required `ABC1234` or `ABC1D23` | active unique per tenant. Legacy format is industry/common format; Mercosul rule comes from CONTRAN standard. [CITED: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao7292018consolidada.pdf] [ASSUMED] |
| VIN/chassis | uppercase, strip spaces | optional 17 alphanumeric chars excluding I/O/Q for modern VIN; allow blank and consider shorter legacy chassis as future exception. | active unique per tenant when present. [CITED: https://www.gov.br/participamaisbrasil/resolucao-criterio-de-identificacao-de-veiculos] [ASSUMED] |

**Zod pattern:** use `.transform()`/normalizer helpers and `.refine()` for custom CPF/CNPJ/plate/VIN checks; official docs say refinements should return falsy rather than throw. [CITED: https://zod.dev/api]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth/session parsing | Custom bearer-token parser per route | Existing `requireAuth` | Central session validation already exists. [VERIFIED: apps/api/src/http/middleware/requireAuth.ts] |
| Permission checks | Inline permission arrays in routes | Existing `requirePermission` and `PERMISSIONS` constants | Prevents permission key drift. [VERIFIED: apps/api/src/permissions/permissions.ts] |
| Tenant ownership checks | Frontend-hidden IDs or query params | Backend `auth.tenantId` filters and tenant-scope helpers | Prevents cross-tenant access. [VERIFIED: apps/api/src/tenancy/tenantScope.ts] |
| Audit sanitization | Per-route secret filtering | Existing `writeAuditLog` | Central redaction drops sensitive-shaped metadata keys. [VERIFIED: apps/api/src/audit/auditService.ts] |
| Duplicate race prevention | Service-only `findFirst` checks | PostgreSQL partial unique indexes | DB enforces concurrent active duplicates. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |
| UI primitives | New component library | Existing local components/CSS | Visual contract and shadcn-like primitives already exist. [VERIFIED: apps/web/src/components/ui/button.tsx] |

**Key insight:** Phase 03 is not blocked by missing libraries; the hard problems are tenant scoping, duplicate race safety, and audit completeness. [VERIFIED: source review]

## Common Pitfalls

### Pitfall 1: Partial Unique Index Drift

**What goes wrong:** Prisma schema appears correct, but duplicate soft-deleted rows still block or active duplicate rows slip through. [CITED: https://github.com/prisma/prisma/issues/22567]
**Why it happens:** Active-only uniqueness depends on a SQL predicate, not a normal Prisma `@@unique`. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html]
**How to avoid:** Hand-edit generated migration SQL and add tests that soft-delete a row, recreate the same normalized value, and reject two active rows. [ASSUMED]
**Warning signs:** `@@unique([tenantId, plateNormalized])` in Prisma schema without raw SQL partial index. [ASSUMED]

### Pitfall 2: Cross-Tenant Linking

**What goes wrong:** Tenant A links a vehicle to Tenant B's customer by guessing an ID. [VERIFIED: .planning/ROADMAP.md]
**Why it happens:** The service verifies `vehicleId` but not `customerId` under the same tenant. [ASSUMED]
**How to avoid:** Require both IDs with `tenantId: auth.tenantId` before link/update; return 404 or 400 without revealing cross-tenant existence. [VERIFIED: apps/api/src/test/tenant-isolation.test.ts]
**Warning signs:** `connect: { id: customerId }` without a prior tenant-scoped lookup. [ASSUMED]

### Pitfall 3: Audit Payload Stores Sensitive Customer Data Excessively

**What goes wrong:** Full documents, full phones, or notes are copied into audit metadata unnecessarily. [VERIFIED: AGENTS.md]
**Why it happens:** Audit metadata captures entire request bodies. [ASSUMED]
**How to avoid:** Store changed field names, normalized duplicate keys only when needed, and entity IDs; avoid full notes and secrets. [VERIFIED: apps/api/src/audit/auditService.ts]
**Warning signs:** `metadata: parsed.data` in customer/vehicle routes. [ASSUMED]

### Pitfall 4: UI Filters Become Proof of Security

**What goes wrong:** Hidden buttons or filtered views are treated as authorization. [VERIFIED: AGENTS.md]
**Why it happens:** Phase 2 UI already filters menus by permission for usability. [VERIFIED: apps/web/src/App.tsx]
**How to avoid:** Add API 403 tests and UI blocked-state tests for CAV permissions. [VERIFIED: apps/web/src/test/auth-ui.test.tsx]
**Warning signs:** new UI tests pass without any backend permission test. [ASSUMED]

## Code Examples

### Normalization Helpers

```typescript
const onlyDigits = (value: string) => value.replace(/\D/g, "");
const plateNormalized = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .refine((value) => /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(value), {
    error: "Placa invalida.",
  });
```

Source: Zod refinements/transforms official docs plus Brazilian format research. [CITED: https://zod.dev/api] [ASSUMED]

### Tenant-Safe Link Check

```typescript
const [customer, vehicle] = await Promise.all([
  prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } }),
  prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId, deletedAt: null } }),
]);

if (!customer || !vehicle) {
  throw notFound();
}
```

Source: existing tenant-scope helper pattern. [VERIFIED: apps/api/src/tenancy/tenantScope.ts]

### UI Client Pattern

```typescript
export async function listCustomers(
  accessToken: string,
  filters: { q?: string } = {},
): Promise<Customer[]> {
  const query = new URLSearchParams(filters).toString();
  return request(`/customers${query ? `?${query}` : ""}`, accessToken);
}
```

Source: existing typed web admin client pattern. [VERIFIED: apps/web/src/api/admin.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Numeric-only CNPJ validation | Accept 14-position alphanumeric CNPJ for new registrations | Receita Federal production rollout starts July 27-31, 2026 | Phase 03 should not reject letters in CNPJ after normalization. [CITED: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico] |
| Legacy Brazilian plate only `ABC1234` | Accept legacy and Mercosul `ABC1D23` | Mercosul standard established by CONTRAN Resolution 729/2018 | Vehicle validator must allow both formats. [CITED: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao7292018consolidada.pdf] [ASSUMED] |
| Schema-only duplicate rules | SQL partial unique indexes for active soft-delete rows | PostgreSQL supports partial unique indexes; Prisma issue documents soft-delete uniqueness gap | Migration must include raw SQL indexes. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |

**Deprecated/outdated:**
- Numeric-only CNPJ validation is no longer sufficient after July 2026 rollout. [CITED: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico]
- Customer communication shortcuts in customer screens remain prohibited by product scope. [VERIFIED: .planning/REQUIREMENTS.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Vehicle.customerId` as one current customer link is enough for MVP CAV-03. | Phase Requirements, Recommended Data Model | If ownership/contact history must be many-to-many now, planner needs a link table and more UI. |
| A2 | Customer phone duplicate should block active duplicates when present. | Validation and Duplicate Rules | Some workshops may share household/fleet phone numbers; user may prefer warning only. |
| A3 | Email should not be unique for customers in MVP. | Validation and Duplicate Rules | If user expects email login/portal identity later, uniqueness may need stronger modeling. |
| A4 | Chassis/VIN should be optional and allow future legacy exceptions. | Validation and Duplicate Rules | Strict 17-char validation may reject older/local records; loose validation may admit bad modern VINs. |
| A5 | Operator default role should receive create/update customer/vehicle permissions. | Permission Namespace Additions | If the tenant wants stricter roles, seed defaults need adjustment. |

## Open Questions

1. **Should customer duplicate by phone be a hard block or warning?**
   What we know: requirement CAV-06 says duplicates must be prevented according to configured unique fields. [VERIFIED: .planning/REQUIREMENTS.md]
   What's unclear: no Phase 03 CONTEXT.md specifies which customer fields are configured unique.
   Recommendation: MVP hard-block active duplicate document; hard-block active duplicate phone only if provided, unless user confirms warning-only.

2. **Is one current customer per vehicle enough?**
   What we know: CAV-03 says one or more vehicles can link to a customer. [VERIFIED: .planning/REQUIREMENTS.md]
   What's unclear: it does not require vehicle ownership/contact history across multiple customers.
   Recommendation: use `Vehicle.customerId` now and append history events for link changes.

3. **Should CPF/CNPJ check digits be implemented now?**
   What we know: CPF has 11 digits and CNPJ has 14 positions; alphanumeric CNPJ starts in production in late July 2026. [CITED: https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf] [CITED: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico]
   What's unclear: project requirements only state optional document and duplicate prevention, not official document verification.
   Recommendation: validate length/charset and normalize now; add check-digit validation only if it fits Phase 03 budget.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts, API/web build/tests | yes | v22.14.0 | none |
| npm | package scripts | yes | 10.9.2 | none |
| Docker | PostgreSQL/API/web smoke | yes | 29.6.1 | local Node plus existing DB if Docker unavailable |
| psql CLI | manual DB inspection | no | - | use Prisma Client/tests or Docker exec if needed |
| Git | status/commit docs | yes | 2.51.0.windows.1 | none |

**Missing dependencies with no fallback:** none for planned implementation.
**Missing dependencies with fallback:** `psql` CLI is missing; use Prisma migrations/tests or Docker-based PostgreSQL access.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10, Testing Library React 16.3.2 [VERIFIED: npm ls] |
| Config file | `apps/api/vitest.config.ts`, `apps/web/vite.config.ts` [VERIFIED: rg --files] |
| Quick run command | `npm run test -w apps/api -- customer-vehicles` and `npm run test -w apps/web -- customer-vehicles-ui` |
| Full suite command | `npm run verify` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CAV-01 | customer CRUD and soft delete | API integration | `npm run test -w apps/api -- customer-vehicles` | no, Wave 0 |
| CAV-02 | vehicle CRUD and soft delete | API integration | `npm run test -w apps/api -- customer-vehicles` | no, Wave 0 |
| CAV-03 | link vehicle to customer | API integration + UI | `npm run test -w apps/api -- customer-vehicles` | no, Wave 0 |
| CAV-04 | customer search by name/phone/document | API integration + UI | `npm run test -w apps/api -- customer-vehicles` | no, Wave 0 |
| CAV-05 | vehicle search by plate/customer | API integration + UI | `npm run test -w apps/api -- customer-vehicles` | no, Wave 0 |
| CAV-06 | duplicate prevention | API integration | `npm run test -w apps/api -- customer-vehicles` | no, Wave 0 |
| CAV-07 | basic history | API integration + UI | `npm run test -w apps/api -- customer-vehicles` | no, Wave 0 |
| CAV-08 | audit entries | API integration | `npm run test -w apps/api -- customer-vehicles audit` | no, Wave 0 |
| CAV-09 | tenant isolation | API integration | `npm run test -w apps/api -- customer-vehicles tenant-isolation` | no, Wave 0 |

### Sampling Rate

- **Per task commit:** targeted API or web customer/vehicle tests.
- **Per wave merge:** `npm run verify`.
- **Phase gate:** `npm run db:migrate` then `npm run verify`; Docker smoke if UI/API routing changed.

### Wave 0 Gaps

- [ ] `apps/api/src/test/customer-vehicles.test.ts` covers CAV-01..CAV-09.
- [ ] Extend `apps/api/src/test/testData.ts` cleanup and fixtures for new customer/vehicle/history tables.
- [ ] `apps/web/src/test/customer-vehicles-ui.test.tsx` covers list/search/create/link/soft-delete/403 blocked states.
- [ ] Optional: route-level test for permission denial by each new namespace group.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Existing `requireAuth` and access/session validation. [VERIFIED: apps/api/src/http/middleware/requireAuth.ts] |
| V3 Session Management | yes | Existing session-backed bearer access token and logout/refresh model. [VERIFIED: apps/api/src/auth/sessions.ts] |
| V4 Access Control | yes | `requirePermission`, tenant-scoped queries, cross-tenant tests. [VERIFIED: apps/api/src/http/middleware/requirePermission.ts] |
| V5 Input Validation | yes | Zod request schemas plus normalized fields. [VERIFIED: apps/api/src/http/routes/users.ts] [CITED: https://zod.dev/api] |
| V6 Cryptography | no new crypto | Do not add cryptography for Phase 03; use existing auth/session crypto only. [VERIFIED: scope review] |
| V7 Error Handling | yes | Existing `HttpError`, `asyncHandler`, and global error handler avoid stack/secret leakage. [VERIFIED: apps/api/src/http/errors.ts] |
| V8 Data Protection | yes | Avoid full sensitive customer data in audit metadata; tenant isolation for PII. [VERIFIED: AGENTS.md] |

### Known Threat Patterns for JO.IA Phase 03

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant customer/vehicle access | Information Disclosure / Elevation | Derive tenant from auth context; never accept tenantId from request. [VERIFIED: apps/api/src/http/middleware/requireAuth.ts] |
| Cross-tenant link by guessed ID | Tampering | Validate both customer and vehicle under `auth.tenantId` before linking. [VERIFIED: apps/api/src/tenancy/tenantScope.ts] |
| Duplicate race condition | Tampering | PostgreSQL partial unique indexes and Prisma transaction handling. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |
| Audit overcollection of PII/secrets | Information Disclosure | Store changed fields and IDs, not raw request bodies; use `writeAuditLog` sanitizer. [VERIFIED: apps/api/src/audit/auditService.ts] |
| Frontend-only permission control | Elevation | Backend `requirePermission` tests and UI 403 blocked-state tests. [VERIFIED: apps/api/src/test/permissions.test.ts] |

## Implementation Slices

1. **Schema and permissions:** Prisma models, migration SQL partial indexes, permission constants/details, seed updates, test cleanup fixtures. [VERIFIED: prisma/schema.prisma]
2. **API validators/services/routes:** customer/vehicle normalizers, CRUD/search/link/history services, routers mounted after `requireAuth`, audit on mutations. [VERIFIED: apps/api/src/app.ts]
3. **API tests:** RED/GREEN coverage for CRUD, soft delete, duplicate rules, history, audit, permissions, and cross-tenant attempts. [VERIFIED: apps/api/src/test/tenant-isolation.test.ts]
4. **Web client and UI module:** `api/customers.ts`, `CustomersWorkspace`, nav entries gated by new permissions, compact filters/tables/forms/detail/history, backend 403 blocked states. [VERIFIED: apps/web/src/api/admin.ts] [VERIFIED: docs/VISUAL_CONTRACT.md]
5. **UI tests and final gate:** mocked fetch contracts for customer/vehicle flows, prohibited communication language, `npm run db:migrate`, `npm run verify`. [VERIFIED: apps/web/src/test/auth-ui.test.tsx]

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project constraints, stack, tenant/security/audit/quality rules.
- `.planning/ROADMAP.md` - Phase 03 goal, scope, risks, success criteria.
- `.planning/REQUIREMENTS.md` - CAV-01..CAV-09.
- `.planning/STATE.md` - current completed Phase 2 state and decisions.
- `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-06-SUMMARY.md` - Phase 2 UI/API patterns and verification.
- `docs/VISUAL_CONTRACT.md` - compact operational UI rules and communication prohibitions.
- `apps/api/src/app.ts`, middleware, routes, permission service, tenant helpers, audit service, tests - established backend patterns.
- `apps/web/src/App.tsx`, `apps/web/src/api/admin.ts`, `apps/web/src/test/auth-ui.test.tsx` - established frontend patterns.
- `npm ls`, `npm view`, and package-legitimacy seam - package versions and risk signals.

### Secondary (MEDIUM confidence)

- Prisma docs: https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes
- PostgreSQL docs: https://www.postgresql.org/docs/current/indexes-partial.html
- Prisma issue on partial unique indexes and soft delete: https://github.com/prisma/prisma/issues/22567
- Zod docs: https://zod.dev/api
- Express 5 error docs: https://expressjs.com/en/5x/guide/error-handling/
- React input docs: https://react.dev/reference/react-dom/components/input
- React list docs: https://react.dev/learn/rendering-lists
- React Router BrowserRouter docs: https://reactrouter.com/api/declarative-routers/BrowserRouter

### Tertiary (LOW confidence)

- Receita Federal CPF/CNPJ public pages/PDFs for format and 2026 alphanumeric CNPJ rollout.
- CONTRAN/SENATRAN/Gov.br vehicle identification pages/PDFs for Mercosul plate and VIN/chassis context.
- Non-official legacy plate format references were used only to justify accepting `ABC1234`; planner should treat this as an assumption unless user confirms strict rules.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against local package files, `npm ls`, registry, and codebase usage.
- Architecture: HIGH - based on Phase 2 implemented middleware/routes/tests and project constraints.
- Data model: MEDIUM - tenant/soft-delete/audit patterns are clear, but customer-phone duplicate and vehicle ownership history policy need user confirmation.
- Brazilian validation: MEDIUM for CPF/CNPJ official format, LOW for exact plate/VIN edge cases and legacy exceptions.
- Pitfalls: HIGH for tenant/audit/permission risks, MEDIUM for partial-index implementation details.

**Research date:** 2026-07-20
**Valid until:** 2026-08-19 for codebase patterns; 2026-07-27 for CNPJ alphanumeric rollout details because Receita Federal dates are imminent.
