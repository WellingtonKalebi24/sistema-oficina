# Phase 04: Servicos, Produtos, Compras e Estoque - Research

**Researched:** 2026-07-22
**Domain:** Tenant-scoped catalog and transactional inventory control
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Build Phase 4 as an MVP operational slice for service catalog, product catalog, suppliers, purchases and stock movements.
- Keep the existing stack: React/Vite/TypeScript web, Node/Express/TypeScript API, PostgreSQL, Prisma and Docker Compose.
- Backend authorization remains authoritative. Frontend menus and buttons are convenience only.
- All Phase 4 data must be tenant-scoped from the authenticated session.
- Critical stock writes must be transactional: purchase entries, exits, adjustments, reservations and reservation cancellations.
- Audit critical stock and catalog changes with tenant, user, action, entity, record id, timestamp and concise metadata.
- Do not introduce automatic customer communication, WhatsApp automation, notification delivery, read receipts or message history.

### the agent's Discretion
- Vehicle registration must remain permissive for now. Do not reintroduce strict vehicle form validation while implementing Phase 4.
- Required fields should be visually marked with a red `*`, but backend validation must remain the source of truth.
- Continue using the existing authenticated admin shell and shadcn-style local UI primitives.
- Service catalog entries for labor/services.
- Product categories and products.
- Suppliers.
- Purchases and purchase items.
- Stock entries from purchases.
- Stock exits with origin tracking.
- Authorized stock adjustments with reason.
- Minimum stock configuration and low-stock visual alerts.
- Stock movement history.
- Reservations and reservation cancellation without corrupting physical stock balance.
- Start with Prisma schema and RED API tests for service/product/supplier/purchase/stock contracts.
- Prefer explicit stock ledger rows over mutating balances without history.
- Product availability should be derived or updated transactionally from physical quantity minus active reservations.
- Avoid broad UI polish work outside the operational screens needed for Phase 4 verification.

### Deferred Ideas (OUT OF SCOPE)
- None recorded in `04-CONTEXT.md`.
</user_constraints>

## Summary

Phase 4 should add a tenant-scoped catalog and inventory module using the current React/Vite/TypeScript, Express/TypeScript, PostgreSQL, Prisma, Docker Compose and Vitest stack already present in the repo. [VERIFIED: codebase grep] No new external packages are required for the backend or frontend implementation. [VERIFIED: package.json]

The implementation should make stock correctness a backend responsibility: write every purchase entry, stock exit, stock adjustment, reservation and reservation cancellation inside a Prisma transaction, create immutable movement/reservation history rows, update or derive product balances under the authenticated tenant, and audit critical actions with concise metadata. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions] [VERIFIED: phase context]

**Primary recommendation:** Implement Phase 4 as backend-first RED contracts, then API services, then the authenticated stock UI; use PostgreSQL row-level locking or guarded atomic updates inside Prisma transactions for STK-13 concurrency safety. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]

## Project Constraints (from AGENTS.md)

- Keep React, Vite, TypeScript, Node.js, Express, PostgreSQL, Prisma and Docker Compose unless a technical justification and recorded decision change the stack. [VERIFIED: AGENTS.md]
- Enforce authorization in the backend; frontend route/button hiding is not sufficient. [VERIFIED: AGENTS.md]
- Filter and validate all operational records by authenticated tenant. [VERIFIED: AGENTS.md]
- Do not send messages, open WhatsApp automatically, or record delivery/read communication status. [VERIFIED: AGENTS.md]
- Use transactions for stock, quote, work order and financial integrity. [VERIFIED: AGENTS.md]
- Audit critical actions with tenant, user, action, entity, record, timestamp and relevant non-secret values. [VERIFIED: AGENTS.md]
- Do not complete a phase with failing lint, type check, tests, migrations or critical validation. [VERIFIED: AGENTS.md]
- Use executable verification; visible files/screens/endpoints alone do not prove completion. [VERIFIED: AGENTS.md]
- Start file-changing work through GSD workflow entry points unless the user explicitly bypasses it. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Service catalog CRUD/deactivation | API / Backend | Database / Storage | Backend owns permission, tenant scope, validation and audit; database stores active/deactivated state. [VERIFIED: phase context] |
| Product categories/products/minimum stock | API / Backend | Database / Storage | Backend validates tenant-owned category/product relationships and stores minimum stock used for calculated alerts. [VERIFIED: phase context] |
| Supplier management | API / Backend | Database / Storage | Supplier records are tenant operational data and must not cross tenants. [VERIFIED: requirements STK-03/STK-14] |
| Purchase with purchase items | API / Backend | Database / Storage | Purchase registration must create purchase rows and stock entry movement rows transactionally. [VERIFIED: requirements STK-04/STK-05] |
| Stock exits/adjustments | API / Backend | Database / Storage | Backend enforces origin/reason/permission, prevents invalid balances and writes audit rows. [VERIFIED: requirements STK-06/STK-07/STK-13] |
| Reservations/cancellations | API / Backend | Database / Storage | Reservation changes affect availability, not physical balance, and require transactionally consistent state. [VERIFIED: requirements STK-10/STK-11] |
| Low-stock alerts | Browser / Client | API / Backend | UI displays calculated visual state from product stock data; no notification records are created. [VERIFIED: 04-UI-SPEC.md] |
| Movement history | API / Backend | Browser / Client | Backend returns tenant-scoped ledger rows with source operation; UI renders scan-friendly tables. [VERIFIED: requirements STK-12] |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STK-01 | User can create, edit, list and deactivate service catalog entries. | Use Zod schemas, route-level `requirePermission`, soft deactivation and audit pattern from Phase 3. [VERIFIED: codebase grep] |
| STK-02 | User can create product categories and products. | Add tenant-scoped `ProductCategory` and `Product` models with backend duplicate checks and Prisma indexes. [VERIFIED: requirements] |
| STK-03 | User can create and manage suppliers. | Add tenant-scoped supplier CRUD with optional document/phone normalization lighter than customer rules. [VERIFIED: phase context] |
| STK-04 | User can register purchases and purchase items. | Model purchase header/items and validate at least one item through Zod object/array checks. [CITED: https://zod.dev/api] |
| STK-05 | Purchase entry increases product stock through a transactional stock movement. | Wrap purchase, items, movement rows and balance update in `prisma.$transaction`. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions] |
| STK-06 | Authorized user can register stock exits with origin tracking. | Add `stock.exits.create` permission and require origin text/source reference before movement write. [VERIFIED: permissions.ts pattern] |
| STK-07 | Authorized user can register stock adjustments with reason and audit. | Add `stock.adjustments.create`; require reason; write sanitized audit metadata. [VERIFIED: auditService.ts] |
| STK-08 | User can configure minimum stock for products. | Store `minimumStock` on product or stock state and expose it in product CRUD. [VERIFIED: 04-UI-SPEC.md] |
| STK-09 | System calculates low-stock visual alerts from current stock data. | Return physical/reserved/available/minimum in product list; UI renders `Estoque baixo` only. [VERIFIED: 04-UI-SPEC.md] |
| STK-10 | User can reserve parts for a quote or work order without corrupting physical balance. | Store active reservation rows and increase reserved quantity without reducing physical quantity. [VERIFIED: phase context] |
| STK-11 | User can cancel a reservation and restore availability. | Mark reservation cancelled and reduce reserved quantity transactionally. [VERIFIED: phase context] |
| STK-12 | User can inspect stock movement history with source operation. | Create immutable `StockMovement` rows with movement type, quantity, source and balance-after fields. [VERIFIED: requirements] |
| STK-13 | Concurrent stock operations do not produce negative or incorrect balances. | Use row-level locks or guarded updates in one transaction; PostgreSQL row locks block concurrent writers on the same row. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html] |
| STK-14 | Catalog, supplier and stock data cannot cross tenant boundaries. | Follow Phase 3 tenant helper pattern and add cross-tenant integration tests. [VERIFIED: tenantScope.ts] |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.14.0 local | API runtime | Existing local runtime used by npm scripts. [VERIFIED: environment probe] |
| TypeScript | 6.0.3 pinned | Static typing | Root workspace pins TypeScript. [VERIFIED: package.json] |
| Express | 5.2.1 pinned; latest 5.2.1 modified 2026-07-14 | HTTP routing/middleware | Existing API stack; Express 5 forwards rejected async route promises to error handling. [VERIFIED: npm registry] [CITED: https://expressjs.com/en/guide/error-handling/] |
| Prisma Client | 7.8.0 pinned; latest 7.9.0 modified 2026-07-22 | ORM and migrations | Existing schema/migration layer; use `prisma.$transaction` for inventory writes. [VERIFIED: package.json] [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions] |
| PostgreSQL | Docker image `postgres:17-alpine` | Durable relational store | Existing Compose database; row locks support inventory concurrency control. [VERIFIED: compose.yaml] [CITED: https://www.postgresql.org/docs/current/explicit-locking.html] |
| Zod | 4.4.3 pinned; latest 4.4.3 modified 2026-05-04 | Request validation/transforms | Existing API schema library; supports object validation, transforms, preprocess and refinement. [VERIFIED: npm registry] [CITED: https://zod.dev/api] |
| React | 19.2.7 pinned; latest 19.2.8 modified 2026-07-21 | Authenticated admin UI | Existing web runtime and admin shell. [VERIFIED: package.json] |
| Vite | 8.1.4 pinned; latest 8.1.5 modified 2026-07-22 | Web build/dev server | Existing web tooling. [VERIFIED: package.json] |
| Vitest | 4.1.10 pinned; latest 4.1.10 modified 2026-07-06 | API/web test runner | Existing test scripts use Vitest. [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@prisma/adapter-pg` | 7.8.0 pinned | Prisma PostgreSQL adapter | Required by existing Prisma client creation. [VERIFIED: apps/api/src/db/prisma.ts] |
| `helmet` | 8.3.0 pinned | HTTP security headers | Already mounted in API app. [VERIFIED: apps/api/src/app.ts] |
| `pino` / `pino-http` | 10.3.1 / 11.0.0 pinned | Structured logging | Already mounted in API app. [VERIFIED: apps/api/src/app.ts] |
| Font Awesome React | 3.5.0 pinned | UI icons | UI contract names this as existing icon library. [VERIFIED: 04-UI-SPEC.md] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma transactions plus PostgreSQL locking | In-memory mutex | In-memory locking fails across processes and containers; database locking matches the existing PostgreSQL durability boundary. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html] |
| Ledger rows plus current stock state | Mutating only a product quantity field | Quantity-only updates lose movement/source history and do not satisfy STK-12. [VERIFIED: requirements] |
| Existing local UI primitives | New shadcn initialization | UI-SPEC explicitly says do not initialize a new shadcn preset in Phase 4. [VERIFIED: 04-UI-SPEC.md] |

**Installation:**
```bash
# No new packages recommended for Phase 4.
```

## Package Legitimacy Audit

No external package installation is required for this phase. [VERIFIED: package.json] Existing stack packages were checked to avoid accidental upgrade/install recommendations. [VERIFIED: package-legitimacy seam]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `express` | npm | latest modified 2026-07-14 | 120M/wk | github.com/expressjs/express | OK | Existing pinned package; no install. [VERIFIED: npm registry] |
| `zod` | npm | latest modified 2026-05-04 | 234M/wk | github.com/colinhacks/zod | OK | Existing pinned package; no install. [VERIFIED: npm registry] |
| `@prisma/client` | npm | latest modified 2026-07-22 | 14.8M/wk | github.com/prisma/prisma | SUS: too-new latest | Keep pinned 7.8.0; do not upgrade in Phase 4. [VERIFIED: package-legitimacy seam] |
| `prisma` | npm | latest modified 2026-07-22 | 14.8M/wk | github.com/prisma/prisma | SUS: too-new latest | Keep pinned 7.8.0; do not upgrade in Phase 4. [VERIFIED: package-legitimacy seam] |
| `react` | npm | latest modified 2026-07-21 | 159M/wk | github.com/react/react | SUS: too-new latest | Keep pinned 19.2.7; do not upgrade in Phase 4. [VERIFIED: package-legitimacy seam] |
| `vite` | npm | latest modified 2026-07-22 | 157M/wk | github.com/vitejs/vite | SUS: too-new latest | Keep pinned 8.1.4; do not upgrade in Phase 4. [VERIFIED: package-legitimacy seam] |
| `vitest` | npm | latest modified 2026-07-06 | 79.9M/wk | github.com/vitest-dev/vitest | SUS: too-new latest | Existing pinned package; no install. [VERIFIED: package-legitimacy seam] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy seam]
**Packages flagged as suspicious [SUS]:** existing latest-version checks flagged `@prisma/client`, `prisma`, `react`, `vite` and `vitest` as too-new; planner should not add install/upgrade tasks for them. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
Authenticated operator
  -> React admin shell "Estoque" tabs
  -> Bearer-token API calls
  -> requireAuth middleware
  -> requirePermission per route
  -> Zod request schema parse
  -> Stock/catalog service
     -> require tenant-owned related records
     -> prisma.$transaction
        -> lock/read product stock state
        -> validate available/physical balance
        -> write purchase/item/reservation/movement rows
        -> update current stock state or reserved aggregate
        -> write sanitized audit log
  -> JSON response with physical, reserved, available, minimum and history
  -> React table/status rendering; low-stock is visual only
```

### Recommended Project Structure
```text
apps/api/src/stock/
  stockSchemas.ts          # Zod schemas and normalization for services/products/suppliers/purchases/stock
  catalogService.ts        # service catalog, categories, products, suppliers
  purchaseService.ts       # purchase header/items and stock entry transaction
  stockService.ts          # exits, adjustments, reservations, cancellations, movement history
apps/api/src/http/routes/
  stockCatalog.ts          # protected catalog routes
  stockMovements.ts        # protected purchase/movement/reservation routes
apps/api/src/test/
  stock-contract.test.ts   # RED then green API contracts
  stock-concurrency.test.ts# concurrent operation tests for STK-13
apps/web/src/api/
  stock.ts                 # typed fetch wrappers
apps/web/src/test/
  stock-ui.test.tsx        # tabs, blocked states, visual alerts, no prohibited copy
```

### Pattern 1: Protected Route Shape
**What:** Mount Phase 4 routers after global `requireAuth`, then require route-specific permission inside each route. [VERIFIED: apps/api/src/app.ts]
**When to use:** Every stock/catalog endpoint. [VERIFIED: AGENTS.md]
**Example:**
```typescript
router.post(
  "/stock/exits",
  requirePermission(prisma, PERMISSIONS.stockExitsCreate),
  asyncHandler(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const parsed = createStockExitSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid stock exit data.");
    const result = await createStockExit(prisma, actorFrom(req, auth), parsed.data);
    res.status(201).json({ data: serializeStockMovement(result) });
  }),
);
```

### Pattern 2: Transactional Stock Write
**What:** Wrap business row writes, balance checks, movement rows and audit in one `prisma.$transaction`. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
**When to use:** Purchases, exits, adjustments, reservations and cancellations. [VERIFIED: phase context]
**Example:**
```typescript
return prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM product_stock WHERE tenant_id = ${actor.tenantId} AND product_id = ${input.productId} FOR UPDATE`;
  const stock = await tx.productStock.findUniqueOrThrow({ where: { productId: input.productId } });
  if (stock.physicalQuantity - stock.reservedQuantity < input.quantity) {
    throw new HttpError(409, "Insufficient available stock.");
  }
  const movement = await tx.stockMovement.create({ data: movementData });
  await tx.productStock.update({ where: { productId: input.productId }, data: nextStockData });
  await writeAuditLog(tx as PrismaDatabase, auditData);
  return movement;
});
```

### Pattern 3: Ledger Plus Current State
**What:** Keep immutable `StockMovement` rows for history/source tracing and maintain one current stock state row per tenant/product for fast reads. [VERIFIED: requirements STK-12] [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]
**When to use:** All product stock mutations. [VERIFIED: phase context]

### Anti-Patterns to Avoid
- **Client-side stock authority:** Browser checks cannot enforce permission, tenant scope or concurrency. [VERIFIED: AGENTS.md]
- **Reservation reduces physical stock:** UI-SPEC requires physical, reserved and available quantities to remain distinct. [VERIFIED: 04-UI-SPEC.md]
- **Movement-free quantity edits:** STK-12 requires movement history with source operation. [VERIFIED: requirements]
- **Unscoped relation IDs:** Product, category, supplier, purchase and reservation IDs must be checked against `tenantId` before use. [VERIFIED: tenantScope.ts pattern]
- **New notifications for low stock:** Low stock is a calculated visual alert only. [VERIFIED: 04-UI-SPEC.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request parsing | Ad hoc `typeof` checks in routes | Zod schemas | Existing API validates with Zod and infers TypeScript types. [VERIFIED: customerSchemas.ts] |
| Transaction management | Manual begin/commit strings | Prisma `$transaction` | Existing project uses Prisma; Prisma rolls transaction work together. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions] |
| Concurrency control | JavaScript mutex/global lock | PostgreSQL row locks or guarded DB updates | Row locks coordinate across API processes and Docker containers. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html] |
| Audit redaction | Route-specific secret filtering | `writeAuditLog` | Existing audit service drops sensitive keys recursively. [VERIFIED: auditService.ts] |
| Permission key drift | String literals scattered across routes/tests | `PERMISSIONS` and seeded `ALL_PERMISSIONS` | Current permissions are centralized and seeded. [VERIFIED: permissions.ts] |

**Key insight:** Inventory correctness is a database-backed invariant, not a UI state problem. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]

## Common Pitfalls

### Pitfall 1: Lost Update Under Concurrent Stock Writes
**What goes wrong:** Two exits/reservations read the same availability and both write success. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]
**Why it happens:** Read-check-write is not protected by a row lock or guarded update. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]
**How to avoid:** Lock the product stock row inside the transaction or use a conditional update that succeeds only when enough availability remains. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]
**Warning signs:** Tests using `Promise.all` can create negative availability or incorrect reserved totals. [VERIFIED: requirements STK-13]

### Pitfall 2: Tenant Leakage Through Related IDs
**What goes wrong:** A tenant A purchase references tenant B supplier/product/category. [VERIFIED: tenantScope.ts pattern]
**Why it happens:** Routes trust submitted IDs without tenant checks. [VERIFIED: AGENTS.md]
**How to avoid:** Add `requireTenantProduct`, `requireTenantSupplier`, `requireTenantCategory` and use them in services before writes. [VERIFIED: tenantScope.ts pattern]
**Warning signs:** Cross-tenant tests can create or mutate records using foreign tenant IDs. [VERIFIED: customer-vehicles.test.ts pattern]

### Pitfall 3: Audit Payloads Become Data Dumps
**What goes wrong:** Audit stores notes, full supplier documents, raw request bodies or secrets. [VERIFIED: auditService.ts]
**Why it happens:** Developers pass entire input objects to audit. [VERIFIED: vehicleService.ts compact metadata pattern]
**How to avoid:** Store action, entity, record id, source ids, quantity deltas and changed field names only. [VERIFIED: AGENTS.md]
**Warning signs:** Audit payload contains `notes`, `token`, `password`, full documents or full item descriptions. [VERIFIED: auditService.ts]

### Pitfall 4: UI Reintroduces Strict Vehicle Validation
**What goes wrong:** Phase 4 touches `App.tsx` and tightens vehicle field validation while adding stock UI. [VERIFIED: 04-CONTEXT.md]
**Why it happens:** Large single-file UI edits drift into existing panels. [VERIFIED: App.tsx]
**How to avoid:** Keep stock UI edits scoped; do not change vehicle form validation/copy. [VERIFIED: 04-CONTEXT.md]
**Warning signs:** New `required`, regex or blocking checks appear in the vehicle form. [VERIFIED: 04-CONTEXT.md]

## Code Examples

### Zod Request Schema With Cross-Field Rule
```typescript
// Source: https://zod.dev/api
export const createPurchaseSchema = z.object({
  supplierId: z.string().trim().min(1),
  purchasedAt: z.iso.datetime(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
      }),
    )
    .min(1),
});
```

### Tenant Guard Helper Pattern
```typescript
// Source: apps/api/src/tenancy/tenantScope.ts
export async function requireTenantProduct(prisma: PrismaDatabase, tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId, deletedAt: null } });
  if (!product) throw notFound();
  return product;
}
```

### Transactional Reservation Cancellation
```typescript
// Sources: https://www.prisma.io/docs/orm/prisma-client/queries/transactions and PostgreSQL explicit locking docs
await prisma.$transaction(async (tx) => {
  const reservation = await tx.stockReservation.findFirstOrThrow({ where: { id, tenantId: actor.tenantId, status: "active" } });
  await tx.$queryRaw`SELECT id FROM product_stock WHERE tenant_id = ${actor.tenantId} AND product_id = ${reservation.productId} FOR UPDATE`;
  await tx.stockReservation.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
  await tx.productStock.update({
    where: { productId: reservation.productId },
    data: { reservedQuantity: { decrement: reservation.quantity } },
  });
  await writeAuditLog(tx as PrismaDatabase, { action: "stock.reservation_cancelled", entity: "stock_reservation", recordId: id, tenantId: actor.tenantId, userId: actor.userId });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4 async wrappers as mandatory | Express 5 can forward rejected async route promises automatically | Express 5 docs current as of 2026-07-22 | Existing `asyncHandler` can remain for consistency; planner should not add new async wrapper dependency. [CITED: https://expressjs.com/en/guide/error-handling/] |
| Quantity-only inventory | Ledger plus current stock state | Required by STK-12 and Phase 4 context | Enables source-operation history and audit. [VERIFIED: requirements] |
| UI alerts as persisted notification records | Calculated visual low-stock badges only | Project constraint current as of 2026-07-22 | Prevents prohibited notification/message scope. [VERIFIED: 04-UI-SPEC.md] |

**Deprecated/outdated:**
- Installing a new shadcn preset for Phase 4: UI-SPEC says use current manual local primitives. [VERIFIED: 04-UI-SPEC.md]
- Adding notification/message entities for low stock: project requirements prohibit notification centers and message queue entities. [VERIFIED: REQUIREMENTS.md]

## Assumptions Log

All claims in this research were verified by local files, GSD seams, npm registry checks or cited official documentation. No `[ASSUMED]` claims are intentionally used. [VERIFIED: research process]

## Open Questions (RESOLVED)

1. **Exact stock precision**
   - What we know: Phase 4 requires quantities, minimum stock and stock movements. [VERIFIED: requirements]
   - Resolution: Use integer-only stock quantities for Phase 4 because the MVP scope is parts/pieces control and no current source artifact or code evidence requires fractional inventory. Use `Int`-compatible persisted quantities and reject non-integer quantity input in backend Zod schemas. Keep monetary values such as prices, unit costs and totals as Decimal/BRL-safe values. [VERIFIED: checker revision instruction] [VERIFIED: requirements]

2. **Future quote/work-order source links**
   - What we know: Quote and work order phases come later, while reservation already needs source reference. [VERIFIED: ROADMAP.md]
   - Resolution: Store source metadata without hard foreign keys to tables that do not exist in Phase 4. Use fields equivalent to `sourceKind`, nullable `sourceId` and nullable operator-facing `sourceLabel`/`sourceReference` on reservations and movements; validate them as tenant-owned only when a concrete Phase 4 entity is referenced. Later quote/work-order phases may backfill typed nullable IDs or add hard foreign keys after those tables exist. [VERIFIED: checker revision instruction] [VERIFIED: phase context]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | API/web scripts | Yes | 22.14.0 | None needed. [VERIFIED: environment probe] |
| npm | workspace scripts | Yes | 10.9.2 | None needed. [VERIFIED: environment probe] |
| Docker | local Compose verification | Yes | 29.6.1 | None needed. [VERIFIED: environment probe] |
| Docker Compose | `compose.yaml` smoke | Yes | v5.3.0 | None needed. [VERIFIED: environment probe] |
| PostgreSQL | database runtime | Via Compose | image `postgres:17-alpine` | Start with `docker compose up db`. [VERIFIED: compose.yaml] |
| Prisma CLI | migrations | Installed through workspace | 7.8.0 pinned, but local `npx prisma --version` needs `DATABASE_URL` | Copy `.env.example` to `.env` or export `DATABASE_URL`. [VERIFIED: .env.example] |

**Missing dependencies with no fallback:**
- Root `.env` is absent, so local Prisma CLI commands requiring `DATABASE_URL` fail until `.env` is created or the variable is exported. [VERIFIED: environment probe]

**Missing dependencies with fallback:**
- None. [VERIFIED: environment probe]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 pinned. [VERIFIED: package.json] |
| API config file | `apps/api/vitest.config.ts`, with `fileParallelism: false`. [VERIFIED: apps/api/vitest.config.ts] |
| Web config file | none; web uses default Vitest config. [VERIFIED: filesystem probe] |
| Quick run command | `npm run test -w apps/api -- stock` and `npm run test -w apps/web -- stock-ui` after Wave 0 test files exist. [VERIFIED: package scripts] |
| Full suite command | `npm run verify`. [VERIFIED: package.json] |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| STK-01..STK-04 | Catalog, supplier and purchase CRUD contracts | API integration | `npm run test -w apps/api -- stock-contract` | No - Wave 0 |
| STK-05..STK-07 | Transactional entries/exits/adjustments and audit | API integration | `npm run test -w apps/api -- stock-contract` | No - Wave 0 |
| STK-08..STK-12 | Minimum stock, low-stock data, reservations and movement history | API integration + web UI | `npm run test -w apps/api -- stock-contract`; `npm run test -w apps/web -- stock-ui` | No - Wave 0 |
| STK-13 | Concurrent writes cannot corrupt balances | API integration concurrency | `npm run test -w apps/api -- stock-concurrency` | No - Wave 0 |
| STK-14 | Tenant isolation | API integration | `npm run test -w apps/api -- stock-contract` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** Run targeted stock API or UI tests affected by the task. [VERIFIED: existing test scripts]
- **Per wave merge:** Run `npm run test -w apps/api -- stock` plus `npm run test -w apps/web -- stock-ui` when web changes exist. [VERIFIED: package scripts]
- **Phase gate:** Run `npm run db:migrate`, `npm run verify`, and Docker smoke if Compose-facing behavior changed. [VERIFIED: ROADMAP.md]

### Wave 0 Gaps
- [ ] `apps/api/src/test/stock-contract.test.ts` - covers STK-01 through STK-12 and STK-14. [VERIFIED: filesystem probe]
- [ ] `apps/api/src/test/stock-concurrency.test.ts` - covers STK-13. [VERIFIED: filesystem probe]
- [ ] `apps/web/src/test/stock-ui.test.tsx` - covers Phase 4 UI contract, blocked states and low-stock visual alerts. [VERIFIED: filesystem probe]
- [ ] `prisma-baseline.test.ts` update - asserts Phase 4 schema and still excludes prohibited communication entities. [VERIFIED: prisma-baseline.test.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Existing `requireAuth` mounted before protected business routes. [VERIFIED: apps/api/src/app.ts] |
| V3 Session Management | Yes | Existing bearer access/refresh session model; Phase 4 should not change session storage. [VERIFIED: STATE.md] |
| V4 Access Control | Yes | Route-level `requirePermission` and tenant guard helpers. [VERIFIED: requirePermission.ts] |
| V5 Input Validation | Yes | Zod request schemas plus backend-only validation authority. [VERIFIED: customerSchemas.ts] [CITED: https://zod.dev/api] |
| V6 Cryptography | No new crypto | Phase 4 should not add tokens/passwords/secrets. [VERIFIED: phase context] |
| V7 Error Handling and Logging | Yes | Existing `createErrorHandler`, pino logging and audit redaction. [VERIFIED: apps/api/src/app.ts] |
| V10 Malicious Code | Yes | No new packages; package legitimacy checked for existing stack. [VERIFIED: package-legitimacy seam] |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant ID reference | Information disclosure / Tampering | Require tenant-owned records before every relation write. [VERIFIED: tenantScope.ts] |
| Lost update / negative stock | Tampering | PostgreSQL row lock or guarded update inside Prisma transaction. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html] |
| SQL injection through raw lock query | Tampering | Use Prisma tagged-template raw queries for dynamic values. [CITED: https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries] |
| Overbroad audit payload | Information disclosure | Use `writeAuditLog` sanitizer and compact metadata. [VERIFIED: auditService.ts] |
| Client-only permission hiding | Elevation of privilege | Backend `requirePermission` per route. [VERIFIED: AGENTS.md] |

## Sources

### Primary (HIGH confidence)
- `AGENTS.md` - project constraints and workflow enforcement. [VERIFIED: local file]
- `.planning/phases/04-servi-os-produtos-compras-e-estoque/04-CONTEXT.md` - Phase 4 locked scope and user preference. [VERIFIED: local file]
- `.planning/phases/04-servi-os-produtos-compras-e-estoque/04-UI-SPEC.md` - Phase 4 UI contract. [VERIFIED: local file]
- `prisma/schema.prisma`, `apps/api/src/tenancy/tenantScope.ts`, `apps/api/src/audit/auditService.ts`, `apps/api/src/app.ts` - current implementation patterns. [VERIFIED: codebase grep]
- npm registry and package-legitimacy seam - package versions, publish dates, repo URLs, postinstall checks and verdicts. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Prisma transactions docs - `https://www.prisma.io/docs/orm/prisma-client/queries/transactions`. [CITED: official docs]
- Prisma raw query docs - `https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries`. [CITED: official docs]
- PostgreSQL explicit locking docs - `https://www.postgresql.org/docs/current/explicit-locking.html`. [CITED: official docs]
- Express error handling docs - `https://expressjs.com/en/guide/error-handling/`. [CITED: official docs]
- Zod API docs - `https://zod.dev/api`. [CITED: official docs]

### Tertiary (LOW confidence)
- None used intentionally. [VERIFIED: research process]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions and scripts were read from local package files and npm registry checks. [VERIFIED: package.json] [VERIFIED: npm registry]
- Architecture: MEDIUM - repo patterns and official DB/ORM docs support the recommendation, but exact stock schema details remain planner design work. [VERIFIED: codebase grep] [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]
- Pitfalls: MEDIUM - concurrency and tenant risks are directly tied to requirements and official PostgreSQL locking docs. [VERIFIED: requirements] [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]

**Research date:** 2026-07-22
**Valid until:** 2026-08-21 for architecture patterns; re-check npm package versions before any install/upgrade task. [VERIFIED: npm registry]
