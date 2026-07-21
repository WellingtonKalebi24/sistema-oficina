---
phase: 03-clientes-e-ve-culos
plan: 02
subsystem: api
tags: [express, zod, prisma, postgres, tenancy, permissions, audit, vitest]

requires:
  - phase: 02-autentica-o-tenant-e-permiss-es
    provides: Authenticated tenant context, requireAuth, requirePermission, audit writer, permission catalog and tenant-scope helpers
  - phase: 03-clientes-e-ve-culos
    provides: Customer, Vehicle and CustomerVehicleHistoryEvent schema, permissions, tenant helpers and RED API contracts from 03-01
provides:
  - Protected tenant-scoped customer API routes for create, edit, list/search, read, soft delete and history
  - Protected tenant-scoped vehicle API routes for create, edit, list/search, read, soft delete, current customer linking and history
  - Backend normalizers for CPF/CNPJ, phone, plate and VIN with alphanumeric CNPJ support
  - Service-level active duplicate checks for customer document, vehicle plate and vehicle VIN while allowing duplicate phones
  - Transactional audit and history writes for customer and vehicle mutations
affects: [phase-03-customers-vehicles, api, tenancy, permissions, audit]

tech-stack:
  added: []
  patterns:
    - Protected operational routers mount after the shared requireAuth gate and gate every route with customers.* or vehicles.* permissions.
    - Customer and vehicle service methods derive tenant scope from req.auth.tenantId and never from request tenant input.
    - Mutations write customer_vehicle_history_events and audit_logs in the same Prisma transaction.

key-files:
  created:
    - apps/api/src/customers/customerSchemas.ts
    - apps/api/src/customers/customerService.ts
    - apps/api/src/customers/vehicleService.ts
    - apps/api/src/http/routes/customers.ts
    - apps/api/src/http/routes/vehicles.ts
  modified:
    - apps/api/src/app.ts

key-decisions:
  - "Kept customer phone duplicate behavior allowed and enforced only active customer document uniqueness in service checks, matching D-01 and D-02."
  - "Accepted 14-position alphanumeric CNPJ values through server-side normalization instead of numeric-only CNPJ validation."
  - "Modeled vehicle current customer changes as updates to Vehicle.customerId plus vehicle.linked history events, without introducing a link table in 03-02."
  - "Kept audit metadata concise with changed field names and related IDs instead of full notes, phones, documents or VIN payloads."

patterns-established:
  - "Customer and vehicle APIs return `{ data: ... }` envelopes and serialize dates to ISO strings like existing Phase 2 admin routes."
  - "Cross-tenant direct reads and mutations fail through tenant-scoped lookup helpers before relation writes."
  - "Vehicle create/update validates related customer ownership before persisting customer links."

requirements-completed:
  - CAV-01
  - CAV-02
  - CAV-03
  - CAV-04
  - CAV-05
  - CAV-06
  - CAV-07
  - CAV-08
  - CAV-09

coverage:
  - id: D1
    description: "Authorized users can create, edit, list, search, read, soft-delete and inspect history for tenant-owned customers."
    requirement: CAV-01
    verification:
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#creates, edits, lists, searches and soft-deletes customers inside the authenticated tenant"
        status: pass
      - kind: other
        ref: "npm run test -w apps/api -- customer-vehicles && npm run typecheck -w apps/api && npm run lint -w apps/api"
        status: pass
    human_judgment: false
  - id: D2
    description: "Authorized users can create, edit, list, search, read, soft-delete and inspect history for tenant-owned vehicles."
    requirement: CAV-02
    verification:
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#creates, edits, lists, searches, links and soft-deletes vehicles inside the authenticated tenant"
        status: pass
    human_judgment: false
  - id: D3
    description: "Vehicle writes link only to active tenant-owned customers and preserve basic link/history events."
    requirement: CAV-03
    verification:
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#writes basic history and sanitized audit rows for customer and vehicle mutations"
        status: pass
    human_judgment: false
  - id: D4
    description: "Customer and vehicle search uses normalized customer name, phone, document, plate and related customer filters."
    requirement: CAV-04
    verification:
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#creates, edits, lists, searches and soft-deletes customers inside the authenticated tenant"
        status: pass
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#creates, edits, lists, searches, links and soft-deletes vehicles inside the authenticated tenant"
        status: pass
    human_judgment: false
  - id: D5
    description: "Active duplicate customer documents, vehicle plates and vehicle VINs are rejected while duplicate phones and soft-delete reuse are allowed."
    requirement: CAV-06
    verification:
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#blocks active duplicate documents, plates and VINs while allowing phone reuse and soft-delete recreation"
        status: pass
    human_judgment: false
  - id: D6
    description: "Customer and vehicle mutations are audited with sanitized payloads and tenant isolation prevents cross-tenant access."
    requirement: CAV-09
    verification:
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#writes basic history and sanitized audit rows for customer and vehicle mutations"
        status: pass
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#prevents tenant A from listing, reading, updating, deleting or linking tenant B records"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-21
status: complete
---

# Phase 03 Plan 02: Customer Vehicle API Summary

**Protected tenant-scoped customer and vehicle APIs with normalized identifiers, active duplicate prevention, audit and history.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-21T00:30:05Z
- **Completed:** 2026-07-21T00:39:57Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- Implemented `/customers` protected routes for create, update, list/search, read, soft delete and history.
- Implemented `/vehicles` protected routes for create, update, list/search, read, soft delete, current customer linking and history.
- Added backend-normalized CPF/CNPJ, phone, plate and VIN schemas with alphanumeric CNPJ support.
- Added transactional audit and history writes for all customer and vehicle mutations.
- Passed targeted API validation and full root `npm run verify`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement customer API behavior** - `f54714e` (feat)
2. **Task 2: Implement vehicle API behavior and current-customer linking** - `6596d88` (feat)
3. **Validation formatting cleanup** - `62396ce` (style)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/api/src/customers/customerSchemas.ts` - Zod request schemas and normalizers for customer, vehicle, filter and identifier payloads.
- `apps/api/src/customers/customerService.ts` - Tenant-scoped customer CRUD/search/history service with duplicate checks, audit and history.
- `apps/api/src/customers/vehicleService.ts` - Tenant-scoped vehicle CRUD/search/link/history service with duplicate checks, audit and history.
- `apps/api/src/http/routes/customers.ts` - Protected `/customers` routes using `customers.*` permission gates.
- `apps/api/src/http/routes/vehicles.ts` - Protected `/vehicles` routes using `vehicles.*` permission gates.
- `apps/api/src/app.ts` - Mounts customer and vehicle routers after shared `requireAuth`.

## Decisions Made

- Kept phone duplicate behavior allowed while blocking active duplicate customer documents, matching Phase 3 D-01 and D-02.
- Accepted alphanumeric CNPJ normalization for 14-position values instead of numeric-only CNPJ assumptions.
- Preserved one current customer link per vehicle through `Vehicle.customerId` and `vehicle.linked` history events rather than introducing a new link table.
- Kept audit payloads concise and avoided storing raw notes, full documents, phone text or VIN bodies in audit metadata.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Applied targeted Prettier formatting**
- **Found during:** Overall verification after Task 2
- **Issue:** `npm run verify` failed at `format:check` for three touched API files.
- **Fix:** Ran targeted Prettier formatting on the customer/vehicle API files.
- **Files modified:** `apps/api/src/customers/customerService.ts`, `apps/api/src/http/routes/customers.ts`, `apps/api/src/http/routes/vehicles.ts`
- **Verification:** `npm run verify` passed after formatting.
- **Committed in:** `62396ce`

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Formatting only; no scope expansion or behavior change.

## Issues Encountered

- Strict TypeScript required explicit Prisma update/create objects instead of dynamic assignment or `undefined` optional fields; this was resolved during Task 1 and Task 2 implementation before commits.
- `npm run verify` initially failed only on Prettier formatting drift; targeted formatting resolved it.

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck -w apps/api` after Task 1 | Pass |
| `npm run test -w apps/api -- customer-vehicles` after Task 1 | Expected partial fail - customer contract passed; vehicle routes still returned 404 before Task 2 |
| `npm run test -w apps/api -- customer-vehicles && npm run typecheck -w apps/api && npm run lint -w apps/api` | Pass - 5 API tests passed, typecheck passed, lint passed |
| `npm run verify` | Pass - format, lint, workspace typecheck and tests passed; web 3 files/10 tests, API 8 files/27 tests, shared no tests with passWithNoTests |

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - the new authenticated customer/vehicle API surface is covered by the 03-02 threat model and integration tests.

## Next Phase Readiness

Ready for `03-03-PLAN.md`: backend customer/vehicle APIs are available for the authenticated UI, including permission enforcement, tenant isolation, duplicate prevention, audit and history endpoints.

## Self-Check: PASSED

- Found summary file at `.planning/phases/03-clientes-e-ve-culos/03-02-SUMMARY.md`.
- Found task commits `f54714e`, `6596d88` and `62396ce` in git history.
- Confirmed required targeted API validation and broader `npm run verify` passed.

---
*Phase: 03-clientes-e-ve-culos*
*Completed: 2026-07-21*
