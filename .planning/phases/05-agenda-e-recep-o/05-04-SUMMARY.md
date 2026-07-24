---
phase: 05-agenda-e-recepcao
plan: 04
subsystem: api
tags: [prisma, postgres, vitest, reception, check-in, audit]

requires:
  - phase: 05-agenda-e-recepcao
    provides: Appointment schema, API and Agenda UI entry points from 05-01 through 05-03
provides:
  - ReceptionCheckIn and ReceptionChecklistItem schema foundation with tenant, appointment, customer and vehicle links
  - RED check-in contract tests for appointment-origin and direct customer/vehicle reception paths
  - RED audit tests for appointment conversion, trace appointment creation, check-in creation and later edit audit expectations
  - Reception check-in read/write permission keys and test cleanup ordering
affects: [05-agenda-e-recepcao, api, database, reception, audit]

tech-stack:
  added: []
  patterns:
    - Tenant-scoped Prisma reception records with required appointment traceability
    - RED API contract tests that define check-in service behavior before implementation
    - Permission catalog extension through centralized PERMISSIONS and ALL_PERMISSIONS

key-files:
  created:
    - apps/api/src/test/reception-audit.test.ts
    - prisma/migrations/20260724100000_add_reception_checkins/migration.sql
  modified:
    - apps/api/src/test/reception-contract.test.ts
    - apps/api/src/test/testData.ts
    - apps/api/src/permissions/permissions.ts
    - prisma/schema.prisma

key-decisions:
  - "ReceptionCheckIn requires appointmentId even for direct check-in; later service implementation must create a converted trace appointment first."
  - "Check-in status is persisted as text with the exact default value Aguardando diagnostico."
  - "Attachments remain out of the 05-04 schema because REC-05/D-09/D-11 attachment storage is planned separately."

patterns-established:
  - "Reception checklist rows are separate tenant-scoped child records under ReceptionCheckIn."
  - "Reception test cleanup deletes checklist/check-ins before appointments, then customer and vehicle rows."

requirements-completed: [REC-03, REC-04, REC-06, REC-07, REC-08]

coverage:
  - id: D1
    description: "RED contracts define appointment-origin check-in conversion, status Aguardando diagnostico and required-vs-optional reception data."
    requirement: REC-03
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- reception-contract reception-audit (expected RED: /reception/check-ins returns 404)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prisma schema and migration add ReceptionCheckIn and ReceptionChecklistItem with tenant, appointment, customer and vehicle traceability."
    requirement: REC-04
    verification:
      - kind: other
        ref: "DATABASE_URL=postgresql://joia:...@localhost:55432/joia_dev?schema=public npm run db:migrate"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
    human_judgment: false
  - id: D3
    description: "RED audit contracts define audit events for conversion, direct trace appointment creation, check-in creation and later edits."
    requirement: REC-08
    verification:
      - kind: integration
        ref: "apps/api/src/test/reception-audit.test.ts#reception check-in audit RED contract (expected RED: /reception/check-ins returns 404)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Permission catalog exposes reception.checkins.read and reception.checkins.write for future backend enforcement."
    requirement: REC-06
    verification:
      - kind: other
        ref: "npm run lint -w apps/api"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-24
status: complete
---

# Phase 05 Plan 04: Reception Check-in Schema and RED Contracts Summary

**Prisma reception check-in/checklist foundation with RED API and audit contracts for appointment conversion, direct trace appointments and required reception facts.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-24T11:50:26Z
- **Completed:** 2026-07-24T11:56:16Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- Added RED check-in contract coverage for D-01 through D-08: appointment-origin check-in, direct check-in, converted appointment traceability, exact `Aguardando diagnostico` status, required customer/vehicle/entry/fuel/damage/checklist data, and optional mileage/items-left/attachments.
- Added RED audit coverage for D-03, D-04, D-10 and REC-08: appointment conversion, direct trace appointment creation, check-in creation and later check-in edits.
- Added `ReceptionCheckIn` and `ReceptionChecklistItem` Prisma models plus migration `20260724100000_add_reception_checkins`.
- Added centralized `reception.checkins.read` and `reception.checkins.write` permission keys.
- Updated test cleanup so checklist rows and check-ins are removed before appointments/customers/vehicles.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add check-in RED contracts** - `6ffb569` (test)
2. **Task 2: Add check-in schema and permissions** - `5851e13` (feat)

**Plan metadata:** recorded in final docs commit.

## Files Created/Modified

- `apps/api/src/test/reception-audit.test.ts` - RED audit expectations for conversion, trace appointment creation, check-in creation and later edit auditing.
- `apps/api/src/test/reception-contract.test.ts` - RED check-in API contract tests for appointment-origin and direct reception flows.
- `prisma/migrations/20260724100000_add_reception_checkins/migration.sql` - SQL migration for check-ins and checklist items.
- `prisma/schema.prisma` - `ReceptionCheckIn` and `ReceptionChecklistItem` models and relations.
- `apps/api/src/permissions/permissions.ts` - Reception check-in read/write permission keys.
- `apps/api/src/test/testData.ts` - Cleanup ordering for reception check-in tables.

## Verification

- `DATABASE_URL=postgresql://joia:...@localhost:55432/joia_dev?schema=public npm run db:migrate` - PASS, database already in sync after applying `20260724100000_add_reception_checkins`.
- `npm run test -w apps/api -- reception-contract reception-audit` - EXPECTED RED, 4 existing tests passed and 6 new check-in tests failed with 404 for `/reception/check-ins`, matching the plan's missing-service/routes boundary.
- `npm run typecheck -w apps/api` - PASS.
- `npm run lint -w apps/api` - PASS.

## Decisions Made

- Required `appointmentId` on `ReceptionCheckIn` to enforce traceability; direct check-in implementation must create a converted trace appointment in the same operation.
- Stored check-in status as a text field with default `Aguardando diagnostico`, matching the service/test contract exactly.
- Kept attachments out of this migration; optional missing attachments are covered in RED contracts, while attachment metadata/storage remains for the dedicated attachments plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run db:migrate` initially failed because this shell did not have `DATABASE_URL` set and no local `.env` exists. The documented local PostgreSQL URL from `.env.example` was exported for verification only; no repository file was changed.

## Known Stubs

None. The only failing behavior is intentional RED coverage for the future `/reception/check-ins` service/routes.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: schema-trust-boundary | `prisma/schema.prisma` | Added tenant-scoped reception persistence for operational check-in facts. This is covered by T-05-10 and T-05-12 mitigations in the plan threat model. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for the next Phase 5 plan to implement check-in service/routes against the RED contracts and schema created here.

## Self-Check: PASSED

- Found created files `apps/api/src/test/reception-audit.test.ts` and `prisma/migrations/20260724100000_add_reception_checkins/migration.sql`.
- Found task commits `6ffb569` and `5851e13` in git history.
- Re-ran migration, API typecheck and API lint successfully; RED test failures are limited to missing `/reception/check-ins` service/routes as planned.

---
*Phase: 05-agenda-e-recepcao*
*Completed: 2026-07-24*
