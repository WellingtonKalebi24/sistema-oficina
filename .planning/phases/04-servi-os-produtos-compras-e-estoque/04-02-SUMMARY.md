---
phase: 04-servi-os-produtos-compras-e-estoque
plan: 02
subsystem: api
tags: [express, prisma, postgres, vitest, stock, purchases, concurrency]
requires:
  - phase: 04-servi-os-produtos-compras-e-estoque
    provides: tenant-scoped service, product, supplier and current stock catalog foundation
provides:
  - Transactional purchase entries with purchase items and stock entry movements.
  - Authorized stock exits and adjustments with source metadata, movement ledger rows and audit logs.
  - PostgreSQL row-lock guarded physical stock updates for concurrent exits and adjustments.
  - Tenant-owned supplier/product validation for purchase and movement writes.
affects: [04-03, 04-04, stock, reservations, work-orders]
tech-stack:
  added: []
  patterns:
    - Prisma transactions wrapping stock writes, movement rows and audit rows.
    - PostgreSQL `FOR UPDATE` row locks on ProductStock before physical quantity mutation.
    - Immutable StockMovement ledger rows with source kind/id/label and balance-after fields.
key-files:
  created:
    - apps/api/src/test/stock-concurrency.test.ts
    - apps/api/src/http/routes/stockMovements.ts
    - apps/api/src/stock/purchaseService.ts
    - apps/api/src/stock/stockService.ts
    - prisma/migrations/20260722120000_add_stock_movements/migration.sql
  modified:
    - prisma/schema.prisma
    - apps/api/src/app.ts
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/stock/stockSchemas.ts
    - apps/api/src/test/stock-contract.test.ts
    - apps/api/src/test/prisma-baseline.test.ts
    - apps/api/src/test/testData.ts
key-decisions:
  - "Stock movement history is represented by immutable StockMovement rows plus the existing ProductStock current-state row."
  - "Purchases, exits and adjustments use database row locks inside Prisma transactions instead of in-memory locking."
  - "Purchase movement source data stores sourceKind/sourceId/sourceLabel without adding future quote or work-order foreign keys."
patterns-established:
  - "Stock mutation routes live under /stock/purchases, /stock/exits, /stock/adjustments and /stock/movements after requireAuth."
  - "Stock audit metadata stores product IDs, source kind, quantity deltas and balances, not raw reasons or request bodies."
requirements-completed: [STK-04, STK-05, STK-06, STK-07, STK-12, STK-13, STK-14]
coverage:
  - id: D1
    description: "Purchases create purchase rows, purchase item rows, entry movement rows and increased physical stock in one transaction."
    requirement: STK-04
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-03/D-04/D-05/D-10 registers purchase items, entry movements and physical stock in one committed operation"
        status: pass
    human_judgment: false
  - id: D2
    description: "Stock exits and adjustments require source/reason data, mutate physical stock transactionally and expose movement history."
    requirement: STK-06
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-05/D-06/D-10 creates authorized exits and adjustments with source data, movement history and audit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Concurrent stock exits and adjustments cannot overdraw physical or available stock."
    requirement: STK-13
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-concurrency.test.ts#stock concurrency contract"
        status: pass
    human_judgment: false
  - id: D4
    description: "Foreign-tenant supplier and product IDs are rejected for purchases, exits and adjustments."
    requirement: STK-14
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-03/D-04/D-05/STK-14 blocks foreign-tenant product and supplier IDs in purchase and stock writes"
        status: pass
    human_judgment: false
duration: 15min
completed: 2026-07-22
status: complete
---

# Phase 04 Plan 02: Transactional Purchases And Stock Movements Summary

**Transactional purchase entries, stock exits, adjustments and movement history with tenant guards, audit rows and database-backed concurrency safety.**

## Performance

- **Duration:** 15min
- **Started:** 2026-07-22T15:17:00Z
- **Completed:** 2026-07-22T15:32:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added `Purchase`, `PurchaseItem` and `StockMovement` Prisma models, indexes and migration.
- Added RED-to-green API contracts for purchase entries, exits, adjustments, movement history, tenant isolation and concurrent stock writes.
- Implemented `/stock/purchases`, `/stock/exits`, `/stock/adjustments` and `/stock/movements` routes with route-level backend permissions.
- Implemented transaction-scoped stock mutations using PostgreSQL row locks on `ProductStock`, movement ledger rows and compact audit payloads.

## Task Commits

1. **Task 1: Extend RED contracts for purchases, movements and concurrent stock writes** - `6ebf4e8` (test)
2. **Task 2: Implement transactional purchases, exits, adjustments and movement history** - `031ba0e` (feat)

## Files Created/Modified

- `apps/api/src/test/stock-contract.test.ts` - Purchase, movement, audit and tenant isolation contracts.
- `apps/api/src/test/stock-concurrency.test.ts` - Concurrent exit and adjustment correctness contracts.
- `prisma/schema.prisma` - Purchase, purchase item and stock movement models and relations.
- `prisma/migrations/20260722120000_add_stock_movements/migration.sql` - Database migration for purchase and movement ledger tables.
- `apps/api/src/permissions/permissions.ts` - New movement-specific permission keys.
- `apps/api/src/stock/stockSchemas.ts` - Purchase, exit, adjustment and movement filter request schemas.
- `apps/api/src/stock/purchaseService.ts` - Transactional purchase entry implementation.
- `apps/api/src/stock/stockService.ts` - Transactional exit, adjustment and movement history implementation.
- `apps/api/src/http/routes/stockMovements.ts` - Protected movement route handlers.
- `apps/api/src/app.ts` - Stock movement router mount.
- `apps/api/src/test/prisma-baseline.test.ts` - Schema baseline coverage for purchase and movement models.
- `apps/api/src/test/testData.ts` - Stock movement/purchase cleanup order for shared integration tests.

## Decisions Made

- Movement history is append-only through `StockMovement`; current balances remain in the existing `ProductStock` row.
- Concurrent physical stock writes are guarded by `SELECT ... FOR UPDATE` inside Prisma transactions.
- Purchase source tracing uses `sourceKind: "purchase"` and `sourceId` set to the purchase id; future quote/work-order links remain out of scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Prisma baseline coverage for new stock ledger models**
- **Found during:** Task 2
- **Issue:** The plan changed the Prisma schema but did not list `apps/api/src/test/prisma-baseline.test.ts`; Phase 4 validation expects schema baseline coverage.
- **Fix:** Added a focused baseline assertion for `Purchase`, `PurchaseItem`, `StockMovement` and balance-after/source fields.
- **Files modified:** `apps/api/src/test/prisma-baseline.test.ts`
- **Verification:** `npm run test -w apps/api -- stock-contract stock-concurrency prisma-baseline` passed.
- **Committed in:** `031ba0e`

**2. [Rule 3 - Blocking] Extended shared integration-test cleanup for purchase and movement tables**
- **Found during:** Task 2
- **Issue:** New purchase and movement rows reference tenant/product records and must be deleted before catalog and tenant cleanup.
- **Fix:** Added optional cleanup delegates for `stockMovement`, `purchaseItem` and `purchase` in dependency order.
- **Files modified:** `apps/api/src/test/testData.ts`
- **Verification:** `npm run test -w apps/api -- stock-contract stock-concurrency prisma-baseline` passed.
- **Committed in:** `031ba0e`

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both were required for executable validation and did not alter vehicle validation, web UI or package dependencies.

## Issues Encountered

- `npm run db:migrate` requires `DATABASE_URL` in this shell; verification was run with the existing local PostgreSQL URL exported.
- TypeScript strict indexed access flagged a test helper reading `headers.authorization`; the helper now checks for the header before use.

## Known Stubs

None in files created or modified for 04-02. Stub scan hits were limited to unrelated pre-existing web placeholder text and package-lock dependency names outside this plan's changed backend files.

## Threat Flags

None. New network routes and stock mutation trust boundaries were already covered by the plan threat model and mitigated with backend permissions, tenant guards, transaction scope, row locks and audit rows.

## User Setup Required

None - no external service configuration or package installation required. Local verification requires `DATABASE_URL` or the default local PostgreSQL connection string in the shell.

## Verification

- `npm run db:migrate` with local `DATABASE_URL`: passed, migration `20260722120000_add_stock_movements` applied and later reported already in sync.
- `npm run test -w apps/api -- stock-contract stock-concurrency`: passed, 2 files / 9 tests.
- `npm run test -w apps/api -- stock-contract stock-concurrency prisma-baseline`: passed, 3 files / 15 tests.
- `npm run typecheck -w apps/api`: passed.
- `npm run lint -w apps/api`: passed.

## Self-Check: PASSED

- Found key created files: `apps/api/src/http/routes/stockMovements.ts`, `apps/api/src/stock/purchaseService.ts`, `apps/api/src/stock/stockService.ts`, `prisma/migrations/20260722120000_add_stock_movements/migration.sql`.
- Found task commits `6ebf4e8` and `031ba0e`.
- Confirmed no tracked-file deletions were introduced by task commits.

## Next Phase Readiness

Plan 04-03 can add reservations on top of the existing `ProductStock` physical/reserved split, movement history route and row-lock transaction pattern.

---
*Phase: 04-servi-os-produtos-compras-e-estoque*
*Completed: 2026-07-22*
