---
phase: 05-agenda-e-recepcao
plan: 01
subsystem: database
tags: [prisma, postgres, permissions, vitest, reception]

requires:
  - phase: 03-clientes-e-veiculos
    provides: tenant-scoped Customer and Vehicle records for appointment links
  - phase: 02-autenticacao-tenant-e-permissoes
    provides: authenticated tenant, permission catalog and audit base
provides:
  - Tenant-scoped Appointment schema and migration
  - Reception appointment permission keys
  - RED API contract coverage for appointment CRUD, tenant validation, ordering and audit expectations
affects: [05-agenda-e-recepcao, api, database, permissions, tests]

tech-stack:
  added: []
  patterns:
    - Tenant-scoped operational appointment model with customer and vehicle FKs
    - RED-first API contract tests for future protected reception routes

key-files:
  created:
    - apps/api/src/test/reception-contract.test.ts
    - prisma/migrations/20260724090000_add_reception_appointments/migration.sql
  modified:
    - prisma/schema.prisma
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/test/testData.ts

key-decisions:
  - "05-01 keeps appointment API behavior intentionally RED for 05-02 while making schema, permissions and cleanup compile-ready."
  - "Appointment status values are stored as text using the product-facing Portuguese states Agendado, Cancelado and Convertido."

patterns-established:
  - "Reception appointment permissions use the centralized PERMISSIONS catalog so seed, bootstrap and test fixtures stay aligned."
  - "Reception test cleanup deletes appointments before vehicles and customers to preserve FK-safe fixture reset order."

requirements-completed: [REC-01, REC-02, REC-07, REC-08]

coverage:
  - id: D1
    description: "Tenant-scoped Appointment schema and migration exist with customer, vehicle, user and date/status indexes."
    requirement: REC-01
    verification:
      - kind: integration
        ref: "npm run db:migrate"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reception appointment permission keys are centralized and available to seed/default permission flow."
    requirement: REC-07
    verification:
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
    human_judgment: false
  - id: D3
    description: "RED appointment contracts cover create, edit, cancel, daily/weekly listing, tenant validation and audit expectations."
    requirement: REC-08
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- reception-contract"
        status: fail
    human_judgment: true
    rationale: "The contract is intentionally RED in 05-01 and currently fails with 404 until the 05-02 API service/routes are implemented."

duration: 15min
completed: 2026-07-24
status: complete
---

# Phase 05 Plan 01: Agenda Schema and RED Contracts Summary

**Tenant-scoped appointment foundation with Prisma migration, reception permission keys and RED API contracts for the upcoming agenda API.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-24T11:16:00Z
- **Completed:** 2026-07-24T11:31:15Z
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- Added RED reception appointment API contracts covering create, edit, cancel, daily/weekly ordering, cross-tenant customer/vehicle rejection and audit expectations.
- Added `Appointment` to Prisma with tenant, customer, vehicle, creator, cancellation and useful tenant/date/status indexes.
- Added `reception.appointments.read`, `reception.appointments.write` and `reception.appointments.cancel` to the centralized permission catalog and default fixture permission flow.
- Updated API test cleanup so appointments are deleted before vehicle/customer rows.

## Task Commits

1. **Task 1: Add RED appointment contracts** - `e3ca661` (test)
2. **Task 2: Add appointment schema and permissions** - `f50ca97` (feat)

**Plan metadata:** recorded in the executor completion output

## Files Created/Modified

- `apps/api/src/test/reception-contract.test.ts` - RED contract tests for appointment API behavior planned for 05-02.
- `prisma/migrations/20260724090000_add_reception_appointments/migration.sql` - SQL migration creating the tenant-scoped `appointments` table.
- `prisma/schema.prisma` - Adds Appointment relations to Tenant, User, Customer and Vehicle.
- `apps/api/src/permissions/permissions.ts` - Adds reception appointment permission keys and details.
- `apps/api/src/test/testData.ts` - Adds FK-safe appointment cleanup before customer/vehicle cleanup.

## Verification

- `npm run db:migrate` with `DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public` - PASS, migration applied then reported in sync.
- `npm run typecheck -w apps/api` - PASS.
- `npm run test -w apps/api -- reception-contract` - EXPECTED RED, 4 tests fail with 404 on missing `/reception/appointments` routes.

## Decisions Made

- Appointment API routes remain intentionally unimplemented in 05-01; 05-02 owns runtime service/routes, tenant validation behavior and audit writes.
- Appointment statuses use the product terms `Agendado`, `Cancelado` and `Convertido` directly in the schema default/contract.
- The initial appointment foundation uses text status/origin fields to avoid adding a broader enum migration before the API behavior is finalized.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run db:migrate` failed on the first attempt because no local `.env` file defines `DATABASE_URL`. The verification was rerun successfully with the same development database URL already used by the API integration tests.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 05-02 to implement protected `/reception/appointments` API routes, tenant validation and audit behavior until the RED contract passes.

## Self-Check: PASSED

- Found created/modified files listed in this summary.
- Found task commits `e3ca661` and `f50ca97` in git history.

---
*Phase: 05-agenda-e-recepcao*
*Completed: 2026-07-24*
