---
phase: 04-servi-os-produtos-compras-e-estoque
plan: 01
subsystem: api
tags: [express, prisma, postgres, zod, vitest, stock, catalog]
requires:
  - phase: 02-autenticacao-tenant-e-permissoes
    provides: authenticated tenant context, permission resolution and audit log
  - phase: 03-clientes-e-veiculos
    provides: tenant-scoped API route and integration test patterns
provides:
  - Tenant-scoped service catalog, product category, product, current stock and supplier schema.
  - Protected stock catalog API routes for services, categories, products and suppliers.
  - Product stock serializer with physical, reserved, available, minimum and low-stock fields.
  - RED-to-green API contract tests and Prisma baseline coverage for STK-01, STK-02, STK-03, STK-08, STK-09 and STK-14.
affects: [04-02, 04-03, 04-04, stock, purchases, reservations]
tech-stack:
  added: []
  patterns:
    - Express routers mounted after requireAuth with route-level requirePermission.
    - Prisma Decimal for money and integer quantities for catalog stock state.
    - Compact stock audit rows through writeAuditLog.
key-files:
  created:
    - apps/api/src/test/stock-contract.test.ts
    - apps/api/src/stock/stockSchemas.ts
    - apps/api/src/stock/catalogService.ts
    - apps/api/src/http/routes/stockCatalog.ts
    - prisma/migrations/20260722000000_add_stock_catalog/migration.sql
  modified:
    - prisma/schema.prisma
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/app.ts
    - apps/api/src/test/prisma-baseline.test.ts
    - apps/api/src/test/testData.ts
key-decisions:
  - "Phase 4 catalog routes use /stock/services, /stock/categories, /stock/products and /stock/suppliers under the existing authenticated API."
  - "Product creation creates a current ProductStock row with integer physical/reserved quantities initialized to zero."
  - "Low-stock is calculated only when minimumStock is greater than zero and availableQuantity is below the configured minimum."
patterns-established:
  - "Catalog deactivation sets deactivatedAt/deactivatedByUserId and excludes inactive rows from default lists."
  - "Stock catalog audit payloads store changed field names and record IDs, not descriptions, notes, full documents or phone bodies."
requirements-completed: [STK-01, STK-02, STK-03, STK-08, STK-09, STK-14]
coverage:
  - id: D1
    description: "Service catalog entries can be created, edited, listed and deactivated in the authenticated tenant."
    requirement: STK-01
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-01 creates, edits, lists and deactivates service entries inside the authenticated tenant"
        status: pass
    human_judgment: false
  - id: D2
    description: "Product categories and products can be created with stored minimum stock and calculated stock summary fields."
    requirement: STK-02
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-08 stores product minimum stock and returns calculated physical, reserved, available and low-stock values"
        status: pass
    human_judgment: false
  - id: D3
    description: "Suppliers are tenant-scoped and support create, read, update and deactivation behavior."
    requirement: STK-03
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-03/D-04 keeps suppliers, categories and products isolated by tenant"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tenant isolation blocks cross-tenant catalog, product and supplier reads and writes."
    requirement: STK-14
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-03/D-04 keeps suppliers, categories and products isolated by tenant"
        status: pass
    human_judgment: false
duration: 9min
completed: 2026-07-22
status: complete
---

# Phase 04 Plan 01: Tenant-Scoped Stock Catalog Summary

**Tenant-scoped service, product, supplier and current-stock catalog foundation with protected Express routes, Prisma schema and integration contracts.**

## Performance

- **Duration:** 9min
- **Started:** 2026-07-22T15:05:21Z
- **Completed:** 2026-07-22T15:14:05Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added Prisma models and migration for `ServiceCatalogEntry`, `ProductCategory`, `Product`, `ProductStock` and `Supplier`.
- Added stock catalog permission keys and mounted protected `/stock/*` catalog routes after authentication.
- Implemented backend Zod validation, tenant-scoped service methods, deactivation, concise audit rows and product stock summary serialization.
- Added RED-to-green Vitest contracts proving CRUD/deactivation, minimum stock, low-stock calculation, audit payloads and cross-tenant blocking.

## Task Commits

1. **Task 1: Add RED catalog API and schema baseline contracts** - `dee8612` (test)
2. **Task 2: Implement tenant-scoped catalog schema, permissions and routes** - `a18f0d9` (feat)

## Files Created/Modified

- `apps/api/src/test/stock-contract.test.ts` - Integration contracts for stock catalog API behavior.
- `apps/api/src/test/prisma-baseline.test.ts` - Phase 4 schema baseline expectations.
- `prisma/schema.prisma` - Tenant-scoped stock catalog and current stock models.
- `prisma/migrations/20260722000000_add_stock_catalog/migration.sql` - PostgreSQL migration for Phase 4 catalog tables and indexes.
- `apps/api/src/permissions/permissions.ts` - Stock catalog and supplier permission keys/details.
- `apps/api/src/stock/stockSchemas.ts` - Zod request schemas and supplier normalization helpers.
- `apps/api/src/stock/catalogService.ts` - Tenant-scoped catalog services, serializers and audit writes.
- `apps/api/src/http/routes/stockCatalog.ts` - Protected Express routes for stock catalog resources.
- `apps/api/src/app.ts` - Stock catalog router mount.
- `apps/api/src/test/testData.ts` - Test cleanup support for new stock foreign keys.

## Decisions Made

- Route contract uses `/stock/services`, `/stock/categories`, `/stock/products` and `/stock/suppliers`.
- Current product stock is represented by one `ProductStock` row per product, initialized during product creation.
- `lowStock` is `true` only when `minimumStock > 0` and `availableQuantity < minimumStock`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exported local DATABASE_URL for migration verification**
- **Found during:** Task 2
- **Issue:** `npm run db:migrate` failed because the shell had no `DATABASE_URL` and the repo has no local `.env`.
- **Fix:** Re-ran the required verification command with the existing local PostgreSQL URL exported for the command.
- **Files modified:** None.
- **Verification:** `npm run db:migrate` passed and reported the schema in sync.
- **Committed in:** Not applicable; environment-only fix.

**2. [Rule 1 - Bug] Corrected low-stock equality semantics**
- **Found during:** Task 2
- **Issue:** A product with `minimumStock: 0` and zero availability was incorrectly marked low stock.
- **Fix:** Changed low-stock calculation to require a configured positive minimum and availability below that minimum.
- **Files modified:** `apps/api/src/stock/catalogService.ts`
- **Verification:** `npm run test -w apps/api -- stock-contract prisma-baseline` passed.
- **Committed in:** `a18f0d9`

**3. [Rule 3 - Blocking] Added stock table cleanup to shared test reset helper**
- **Found during:** Task 2
- **Issue:** New stock rows reference tenants, so existing integration reset helpers need to delete stock rows before tenant deletion.
- **Fix:** Added optional stock delegate cleanup in dependency order without changing vehicle behavior.
- **Files modified:** `apps/api/src/test/testData.ts`
- **Verification:** `npm run test -w apps/api -- stock-contract prisma-baseline` passed.
- **Committed in:** `a18f0d9`

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes were required for correctness or verification; no package installs, UI changes or vehicle validation changes were introduced.

## Issues Encountered

- Prisma client needed explicit `npm exec prisma generate` after the schema change so the API runtime and TypeScript compiler could see new delegates.
- The first `npm run db:migrate` attempt failed without `DATABASE_URL`; the final verification passed with the local database URL exported.

## Known Stubs

None in files created or modified by this plan. A stub scan only found unrelated pre-existing web placeholder text and package-lock dependency names outside the 04-01 changed file set.

## User Setup Required

None - no external service configuration required. Local migration/test commands require `DATABASE_URL` in the shell or `.env`.

## Verification

- `npm run db:migrate` with local `DATABASE_URL`: passed, schema already in sync after applying `20260722000000_add_stock_catalog`.
- `npm run test -w apps/api -- stock-contract prisma-baseline`: passed, 2 files / 9 tests.
- `npm run typecheck -w apps/api`: passed.
- `npm run lint -w apps/api`: passed.

## Self-Check: PASSED

- Found all created/modified 04-01 files.
- Found task commits `dee8612` and `a18f0d9`.

## Next Phase Readiness

Plan 04-02 can build transactional purchases and stock movements on top of `Product`, `ProductStock`, supplier/catalog permissions and the product stock summary serializer.

---
*Phase: 04-servi-os-produtos-compras-e-estoque*
*Completed: 2026-07-22*
