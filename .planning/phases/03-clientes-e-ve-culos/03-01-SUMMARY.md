---
phase: 03-clientes-e-ve-culos
plan: 01
subsystem: database-api-testing
tags: [prisma, postgres, express, permissions, tenancy, vitest]

requires:
  - phase: 02-autentica-o-tenant-e-permiss-es
    provides: Authenticated tenant context, permission catalog/seed, audit logs, protected route middleware and tenant-scope helper patterns
provides:
  - RED API contract tests for customer and vehicle CRUD, search, duplicate, history, audit and tenant isolation behavior
  - Customer, Vehicle and CustomerVehicleHistoryEvent Prisma models
  - PostgreSQL migration with active-row partial unique indexes for customer document, vehicle plate and vehicle VIN
  - Customer and vehicle permission keys integrated with the shared seed catalog
  - Tenant-scope helpers and test fixture cleanup for customer/vehicle records
affects: [phase-03-customers-vehicles, api, database, tenancy, permissions]

tech-stack:
  added: []
  patterns:
    - Tenant-owned operational records use tenantId plus deletedAt/deletedByUserId for soft deletion.
    - Active duplicate prevention for soft-deletable records is enforced with PostgreSQL partial unique indexes.
    - Customer/vehicle permission keys are defined once in the shared permission catalog and consumed by seed/test fixtures.

key-files:
  created:
    - apps/api/src/test/customer-vehicles.test.ts
    - prisma/migrations/20260720000000_add_customers_vehicles/migration.sql
  modified:
    - prisma/schema.prisma
    - prisma/seed.ts
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/tenancy/tenantScope.ts
    - apps/api/src/test/testData.ts
    - apps/api/src/test/prisma-baseline.test.ts

key-decisions:
  - "Used PostgreSQL partial unique indexes, not Prisma @@unique, for active-only duplicate prevention on nullable soft-deletable values."
  - "Kept phone duplicate behavior non-unique while indexing phone_normalized for search."
  - "Kept customer/vehicle API tests RED at route/service 404s because protected route implementation belongs to 03-02."
  - "Did not mark CAV requirements complete from this foundation plan because end-user CRUD/search behavior remains intentionally RED."

patterns-established:
  - "Customer and vehicle tables are tenant-owned, soft-deletable, and store normalized document/phone/plate/VIN fields separately from display input."
  - "Customer/vehicle relationship checks should use tenant-scope helpers before relation writes."
  - "History events are modeled in customer_vehicle_history_events for later transactional route writes."

requirements-completed: []

coverage:
  - id: D1
    description: "Customer/vehicle API contract tests express create, edit, list, search, soft delete, duplicate, history, audit and tenant-isolation expectations."
    requirement: CAV-01
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- prisma-baseline customer-vehicles"
        status: fail
    human_judgment: true
    rationale: "Expected RED for missing /customers and /vehicles route/service behavior planned in 03-02."
  - id: D2
    description: "Prisma schema and migration add Customer, Vehicle and CustomerVehicleHistoryEvent with tenant ownership and soft-delete fields."
    requirement: CAV-01
    verification:
      - kind: integration
        ref: "npm run db:migrate"
        status: pass
      - kind: integration
        ref: "apps/api/src/test/prisma-baseline.test.ts#contains the Phase 3 customer and vehicle data contract"
        status: pass
    human_judgment: false
  - id: D3
    description: "Active duplicate customer document, vehicle plate and vehicle VIN rules are enforced by partial unique indexes while phone duplicates remain allowed."
    requirement: CAV-06
    verification:
      - kind: integration
        ref: "prisma/migrations/20260720000000_add_customers_vehicles/migration.sql"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- prisma-baseline customer-vehicles"
        status: fail
    human_judgment: true
    rationale: "Database indexes exist and migration passes, but API duplicate route behavior remains RED for 03-02."
  - id: D4
    description: "Customer and vehicle permission keys are seeded through shared constants and available for later protected routes."
    requirement: CAV-09
    verification:
      - kind: integration
        ref: "npm run typecheck -w apps/api"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-21
status: complete
---

# Phase 03 Plan 01: Customer Vehicle Foundation Summary

**Tenant-owned customer and vehicle data foundation with RED API contracts and active-only duplicate indexes.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-21T00:19:19Z
- **Completed:** 2026-07-21T00:26:56Z
- **Tasks:** 2 completed
- **Files modified:** 8

## Accomplishments

- Added RED customer/vehicle API integration tests covering CRUD, search, duplicate prevention, CNPJ normalization, soft delete, history, audit and cross-tenant isolation.
- Added Prisma `Customer`, `Vehicle` and `CustomerVehicleHistoryEvent` models with tenant relations, normalized searchable fields, soft-delete fields and user delete/history relations.
- Added hand-authored PostgreSQL migration SQL with partial unique indexes for active customer documents, active vehicle plates and active vehicle VINs.
- Extended permission constants, seed defaults, tenant-scope helpers and test cleanup/fixtures for Phase 3 customer/vehicle data.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED customer and vehicle API contract tests** - `2e91f0f` (test)
2. **Task 2: Add schema, migration, permission keys and tenant helpers** - `d62fd3c` (feat)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/api/src/test/customer-vehicles.test.ts` - RED HTTP contract tests for CAV-01..CAV-09 and D-01..D-09 behavior.
- `apps/api/src/test/prisma-baseline.test.ts` - Requires Phase 3 customer/vehicle models while keeping communication and later business models forbidden.
- `prisma/schema.prisma` - Adds tenant-owned customer, vehicle and customer/vehicle history models.
- `prisma/migrations/20260720000000_add_customers_vehicles/migration.sql` - Creates tables, foreign keys, indexes and active-row partial unique indexes.
- `prisma/seed.ts` - Imports shared `PERMISSIONS` and includes customer/vehicle keys in operator defaults.
- `apps/api/src/permissions/permissions.ts` - Adds customer and vehicle CRUD permission keys and labels.
- `apps/api/src/tenancy/tenantScope.ts` - Adds customer, vehicle and customer-vehicle tenant validation helpers.
- `apps/api/src/test/testData.ts` - Deletes customer/vehicle tables in FK-safe order and adds direct fixtures.

## Decisions Made

- Used raw PostgreSQL partial unique indexes for active-only uniqueness because Prisma schema-only indexes cannot express `deleted_at IS NULL`.
- Kept `phone_normalized` searchable but non-unique, matching D-01.
- Kept route/service behavior intentionally RED for 03-02 instead of adding protected customer/vehicle routers in this foundation plan.
- Did not add customer messaging, quote, work order, reception, attachment, notification or finance models.

## Verification

| Check | Result |
|-------|--------|
| RED: `npm run test -w apps/api -- customer-vehicles prisma-baseline` before implementation | Expected fail - `/customers` and `/vehicles` returned 404; baseline failed because Phase 3 models did not exist. |
| `npm run db:migrate` | Pass - migration applied, then later reported database already in sync. |
| `npx prisma generate` | Pass - regenerated Prisma Client after schema migration. |
| `npm run test -w apps/api -- prisma-baseline customer-vehicles` | Expected fail - `prisma-baseline` passed; 5 customer/vehicle tests failed only on 404 missing route/service behavior planned for 03-02. |
| `npm run typecheck -w apps/api` | Pass. |
| `npm run lint -w apps/api` | Pass. |
| `npm run format:check` | Pass. |
| Exact plan command via `cmd /c "npm run db:migrate && npm run test -w apps/api -- prisma-baseline customer-vehicles && npm run typecheck -w apps/api"` | Expected fail - migration in sync, baseline passed, customer/vehicle tests failed on 404 so shell did not execute final typecheck segment. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Regenerated Prisma Client after migration**
- **Found during:** Task 2 verification
- **Issue:** After migration, customer/vehicle cleanup failed because the installed Prisma Client did not yet expose `customerVehicleHistoryEvent`, `vehicle` or `customer` delegates.
- **Fix:** Ran `npx prisma generate`.
- **Files modified:** Generated client under `node_modules` only; no tracked source files.
- **Verification:** Re-running `npm run test -w apps/api -- prisma-baseline customer-vehicles` moved failures to expected 404 route/service gaps.
- **Committed in:** `d62fd3c`

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** No scope expansion; the fix was required for generated Prisma delegates to match the new schema.

## Issues Encountered

- PowerShell on this environment rejected `&&`; the exact validation command was rerun through `cmd /c` with `DATABASE_URL` already set.
- `npx prisma format` initially failed without `DATABASE_URL` because Prisma config reads the environment; rerun with the configured URL succeeded.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - this plan's new database and tenant helper surfaces are covered by the plan threat model.

## Next Phase Readiness

Ready for `03-02-PLAN.md`: schema, permissions, tenant helpers, fixture cleanup and RED contracts are in place. The remaining expected RED is protected `/customers` and `/vehicles` route/service behavior, including audit/history writes and tenant isolation.

## Self-Check: PASSED

- Found summary file at `.planning/phases/03-clientes-e-ve-culos/03-01-SUMMARY.md`.
- Found task commits `2e91f0f` and `d62fd3c` in git history.
- Confirmed migration and baseline passed; customer/vehicle API tests remain expected RED on missing 03-02 routes.

---
*Phase: 03-clientes-e-ve-culos*
*Completed: 2026-07-21*
