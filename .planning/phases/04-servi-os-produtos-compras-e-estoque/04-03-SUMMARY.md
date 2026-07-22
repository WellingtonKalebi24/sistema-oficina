---
phase: 04-servi-os-produtos-compras-e-estoque
plan: 03
subsystem: api
tags: [express, prisma, postgres, vitest, stock, reservations, concurrency]
requires:
  - phase: 04-servi-os-produtos-compras-e-estoque
    provides: transactional purchases, stock exits, adjustments, movement history and row-lock guarded ProductStock updates
provides:
  - Tenant-scoped StockReservation schema and migration with source metadata.
  - Protected reservation create, list and cancel API endpoints.
  - Transactional reservation and cancellation semantics that update reserved/available quantities without changing physical stock.
  - Reservation history visibility through stock movement ledger rows and compact audit rows.
  - RED-to-green tests for reservation cancellation, tenant isolation and concurrent over-reservation protection.
affects: [04-04, stock-ui, quotes, work-orders]
tech-stack:
  added: []
  patterns:
    - Prisma transactions wrapping reservation state, ProductStock reserved quantity, movement rows and audit rows.
    - PostgreSQL row locks on ProductStock before reservation and cancellation writes.
    - Source metadata stored as sourceKind, nullable sourceId, nullable sourceLabel and nullable sourceReference until quote/work-order tables exist.
key-files:
  created:
    - prisma/migrations/20260722133000_add_stock_reservations/migration.sql
  modified:
    - prisma/schema.prisma
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/stock/stockSchemas.ts
    - apps/api/src/stock/stockService.ts
    - apps/api/src/http/routes/stockMovements.ts
    - apps/api/src/test/stock-contract.test.ts
    - apps/api/src/test/stock-concurrency.test.ts
    - apps/api/src/test/prisma-baseline.test.ts
    - apps/api/src/test/testData.ts
key-decisions:
  - "Reservation APIs use /stock/reservations and /stock/reservations/:reservationId/cancel under the existing authenticated stock router."
  - "Reservations write zero-quantity StockMovement rows so history shows reserved/available balance changes without implying physical stock movement."
  - "Reservation source metadata remains text/id based with no foreign keys to future quote or work-order tables."
patterns-established:
  - "Reservation cancellation is conflict-safe: already-cancelled reservations return 409 and do not double-decrement reserved stock."
  - "Reservation list filtering uses tenant scope plus status/product/source filters."
requirements-completed: [STK-09, STK-10, STK-11, STK-12, STK-13, STK-14]
coverage:
  - id: D1
    description: "Reservations increase reserved quantity and reduce availability while preserving physical stock."
    requirement: STK-10
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-04/D-05/D-10 reserves and cancels parts without changing physical stock"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cancellation restores availability, marks the reservation cancelled and blocks double cancellation corruption."
    requirement: STK-11
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-04/D-05/D-10 reserves and cancels parts without changing physical stock"
        status: pass
    human_judgment: false
  - id: D3
    description: "Concurrent reservations cannot over-reserve available stock."
    requirement: STK-13
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-concurrency.test.ts#D-04/D-05/D-10/STK-13 serializes concurrent reservations so available stock cannot be over-reserved"
        status: pass
    human_judgment: false
  - id: D4
    description: "Reservation create, list and cancel behavior is tenant-scoped."
    requirement: STK-14
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-04/D-05/D-10 rejects reservation create and cancel operations across tenants"
        status: pass
    human_judgment: false
  - id: D5
    description: "Reservation source and balance changes remain visible through API serializers and movement history."
    requirement: STK-12
    verification:
      - kind: integration
        ref: "apps/api/src/test/stock-contract.test.ts#D-04/D-05/D-10 reserves and cancels parts without changing physical stock"
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-07-22
status: complete
---

# Phase 04 Plan 03: Stock Reservations Summary

**Reservation and cancellation transactions for product availability using tenant-scoped source metadata, movement history and row-lock concurrency guards.**

## Performance

- **Duration:** 25min
- **Started:** 2026-07-22T15:08:00Z
- **Completed:** 2026-07-22T15:33:35Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added `StockReservation` schema, migration, indexes and Prisma baseline coverage.
- Added protected reservation create, list and cancel endpoints under the existing stock router.
- Implemented transactional reserved quantity updates with PostgreSQL row locks, compact audit rows and zero-quantity movement history rows.
- Added integration tests for reservation/cancellation behavior, active/cancelled filtering, tenant isolation and concurrent over-reservation safety.

## Task Commits

1. **Task 1: Add reservation and cancellation contracts** - `fe5d729` (test)
2. **Task 2: Implement reservation transactions and availability summaries** - `d5774a1` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added `StockReservation` relations and model.
- `prisma/migrations/20260722133000_add_stock_reservations/migration.sql` - Creates reservation table, indexes and foreign keys.
- `apps/api/src/permissions/permissions.ts` - Added reservation create/cancel permission keys.
- `apps/api/src/stock/stockSchemas.ts` - Added reservation create schema and reservation status filtering.
- `apps/api/src/stock/stockService.ts` - Added reservation list/create/cancel services, serializers and audit.
- `apps/api/src/http/routes/stockMovements.ts` - Added protected reservation routes.
- `apps/api/src/test/stock-contract.test.ts` - Added reservation/cancellation and cross-tenant contracts.
- `apps/api/src/test/stock-concurrency.test.ts` - Added concurrent over-reservation contract.
- `apps/api/src/test/prisma-baseline.test.ts` - Added reservation schema baseline checks.
- `apps/api/src/test/testData.ts` - Added reservation cleanup ordering for integration tests.

## Decisions Made

- Reservation cancellation uses `POST /stock/reservations/:reservationId/cancel` to make the auditable state transition explicit.
- Reservation and cancellation rows in `StockMovement` use `quantityDelta: 0`; physical stock is unchanged while balance-after reserved/available fields show operational availability.
- Source metadata remains nullable and text/id based until future quote and work-order tables exist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Prisma baseline and cleanup coverage for StockReservation**
- **Found during:** Task 2
- **Issue:** The plan changed Prisma schema but did not list `apps/api/src/test/prisma-baseline.test.ts` or shared cleanup updates.
- **Fix:** Added reservation schema assertions and deleted reservation rows before product/tenant cleanup.
- **Files modified:** `apps/api/src/test/prisma-baseline.test.ts`, `apps/api/src/test/testData.ts`
- **Verification:** `npm run test -w apps/api -- stock-contract stock-concurrency prisma-baseline` passed.
- **Committed in:** `d5774a1`

**2. [Rule 3 - Blocking] Regenerated Prisma Client after adding StockReservation**
- **Found during:** Task 2
- **Issue:** Reservation endpoints returned 500 before the generated client knew about the new delegate.
- **Fix:** Ran `npm exec prisma generate` after applying the migration.
- **Files modified:** None tracked.
- **Verification:** `npm run test -w apps/api -- stock-contract stock-concurrency` passed afterward.
- **Committed in:** Not applicable; generated client is not tracked.

**3. [Rule 1 - Bug] Validated reservation cancel route parameter for strict typecheck**
- **Found during:** Task 2
- **Issue:** Express route params are typed as possibly missing or arrays, causing `npm run typecheck -w apps/api` to fail.
- **Fix:** Added an explicit `reservationId` guard before calling the cancellation service.
- **Files modified:** `apps/api/src/http/routes/stockMovements.ts`
- **Verification:** `npm run typecheck -w apps/api` passed.
- **Committed in:** `d5774a1`

**Total deviations:** 3 auto-fixed (1 missing critical, 1 blocking, 1 bug)
**Impact on plan:** All fixes were required for schema validation, runtime correctness or quality gates. No package installs, UI changes or vehicle validation changes were introduced.

## Issues Encountered

- Initial RED verification failed with 404 for `/stock/reservations`, as expected.
- First GREEN test run returned 500 until Prisma Client was regenerated for `StockReservation`.
- Pre-existing dirty files outside 04-03 were present and left unstaged.

## Known Stubs

None in files created or modified for 04-03. Stub scan hits were limited to unrelated pre-existing web placeholder text, package-lock dependency names, and normal backend optional/default syntax.

## Threat Flags

None. The new reservation API surface was covered by the plan threat model and mitigated with backend permissions, tenant filters, transaction scope, row locks and audit rows.

## User Setup Required

None - no external service configuration or package installation required. Local migration/test commands require `DATABASE_URL` or the existing local PostgreSQL default.

## Verification

- `npm run db:migrate` with local `DATABASE_URL`: passed; reservation migration applied, then later reported already in sync.
- `npm run test -w apps/api -- stock-contract stock-concurrency`: passed, 2 files / 12 tests.
- `npm run test -w apps/api -- stock-contract stock-concurrency prisma-baseline`: passed, 3 files / 18 tests.
- `npm run typecheck -w apps/api`: passed.
- `npm run lint -w apps/api`: passed.

## Self-Check: PASSED

- Found key created file `prisma/migrations/20260722133000_add_stock_reservations/migration.sql`.
- Found task commits `fe5d729` and `d5774a1`.
- Confirmed no tracked-file deletions were introduced by task commits.

## Next Phase Readiness

Plan 04-04 can build the authenticated stock UI using product physical/reserved/available summaries, reservation list/cancel endpoints and movement history produced by the backend.

---
*Phase: 04-servi-os-produtos-compras-e-estoque*
*Completed: 2026-07-22*
