---
phase: 06-diagn-stico-e-or-amento
plan: 02
subsystem: api
tags: [express, prisma, quotes, vitest, tenant-isolation]
requires:
  - phase: 06-diagn-stico-e-or-amento
    provides: 06-01 quote schema, quote item schema, quote permissions and discount warning setting
provides:
  - Tenant-scoped authenticated draft quote JSON API.
  - Pure backend quote total calculator with deterministic money output.
  - Quote create/update/list/read service with service/product item snapshots.
  - Warning-only above-limit discount metadata and concise audit events.
affects: [phase-06, quote-api, quote-versioning, quote-pdf, quote-ui]
tech-stack:
  added: []
  patterns:
    - Quote APIs use requireAuth plus requirePermission with quotes.read and quotes.write.
    - Quote totals are recalculated on the backend from item snapshots and persisted totals.
key-files:
  created:
    - apps/api/src/test/quote-calculator.test.ts
    - apps/api/src/test/quote-contract.test.ts
    - apps/api/src/quotes/quoteSchemas.ts
    - apps/api/src/quotes/quoteCalculator.ts
    - apps/api/src/quotes/quoteService.ts
    - apps/api/src/http/routes/quotes.ts
  modified:
    - apps/api/src/test/testData.ts
    - apps/api/src/app.ts
key-decisions:
  - "The API serializes check-in-origin quotes as sourceKind check_in while persisting the 06-01 database-constrained value check-in."
  - "Draft quote totals store aggregate discount and surcharge values, with quote-level adjustment details recalculated from submitted payloads during this MVP slice."
patterns-established:
  - "Draft quote mutations replace the item list atomically and snapshot service/product descriptions and sale/base prices at write time."
  - "Above-limit discounts produce persisted warning metadata and audit rows but never block save."
requirements-completed: [QTE-01, QTE-02, QTE-03, QTE-04, QTE-05, QTE-06, QTE-07]
coverage:
  - id: D1
    description: Authenticated operators can create draft quotes from tenant check-ins or direct tenant customer/vehicle data.
    requirement: QTE-01
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- quote-calculator quote-contract"
        status: pass
    human_judgment: false
  - id: D2
    description: Draft quote items support one service/product list with tenant-scoped catalog validation and price snapshots.
    requirement: QTE-04
    verification:
      - kind: integration
        ref: "apps/api/src/test/quote-contract.test.ts#QTE-02/QTE-04/QTE-05/QTE-06/QTE-07 edits one service/product item list"
        status: pass
    human_judgment: false
  - id: D3
    description: Backend quote totals are deterministic for subtotal, discounts, surcharges and final total.
    requirement: QTE-05
    verification:
      - kind: unit
        ref: "npm run test -w apps/api -- quote-calculator"
        status: pass
    human_judgment: false
  - id: D4
    description: Above-limit discount handling is warning-only and audited without returning 403.
    requirement: QTE-06
    verification:
      - kind: integration
        ref: "apps/api/src/test/quote-contract.test.ts#warning-only discount limit"
        status: pass
    human_judgment: false
  - id: D5
    description: Validity date controls publish readiness while estimated delivery remains nullable.
    requirement: QTE-07
    verification:
      - kind: integration
        ref: "apps/api/src/test/quote-contract.test.ts#direct customer/vehicle quote with empty diagnosis and nullable delivery deadline"
        status: pass
    human_judgment: false
duration: 15 min
completed: 2026-07-28
status: complete
---

# Phase 06 Plan 02: Draft Quote API Summary

**Tenant-scoped draft quote APIs now create, edit, list and read diagnosis-backed quotes with backend-calculated totals and warning-only discount limits.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-28T20:51:00Z
- **Completed:** 2026-07-28T21:06:00Z
- **Tasks:** 2 completed
- **Files modified:** 8

## Accomplishments

- Added RED quote calculator and API contract coverage for QTE-01 through QTE-07.
- Implemented pure `calculateQuoteTotals` using deterministic cents and quantity thousandths.
- Added authenticated `/quotes` JSON routes for list, get, create and draft update.
- Enforced tenant-scoped customer, vehicle, check-in, service and product validation in the backend.
- Persisted backend totals, item snapshots, discount warning metadata and concise quote audit rows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED quote draft and calculator contracts** - `7769a0f` (test)
2. **Task 2: Implement tenant-scoped draft quote API** - `767e2a7` (feat)

## Files Created/Modified

- `apps/api/src/test/quote-calculator.test.ts` - Unit contract for exact totals and discount warning metadata.
- `apps/api/src/test/quote-contract.test.ts` - API contract for draft quote creation, update, tenant isolation and audit.
- `apps/api/src/test/testData.ts` - Reusable quote-related service, product and check-in fixtures.
- `apps/api/src/quotes/quoteSchemas.ts` - Zod schemas for quote filters, create/update payloads, dates, money and item kinds.
- `apps/api/src/quotes/quoteCalculator.ts` - Pure backend total calculation utility.
- `apps/api/src/quotes/quoteService.ts` - Tenant-scoped draft quote service, serializers and audit helpers.
- `apps/api/src/http/routes/quotes.ts` - Authenticated and permission-protected quote JSON routes.
- `apps/api/src/app.ts` - Mounts quote routes after authentication.

## Decisions Made

- Stored check-in quote source using the existing migration constraint value `check-in`, while serializing API output as `check_in` to keep the JSON contract ergonomic.
- Kept above-limit discounts as warning-only metadata and audit, not an authorization blocker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed source kind mismatch with the 06-01 migration constraint**
- **Found during:** Task 2
- **Issue:** The initial implementation persisted `check_in`, but the existing database constraint allows `check-in`.
- **Fix:** Persisted `check-in` and normalized API serialization to `check_in`.
- **Files modified:** `apps/api/src/quotes/quoteService.ts`
- **Verification:** `npm run test -w apps/api -- quote-calculator quote-contract` passed.
- **Committed in:** `767e2a7`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** No scope expansion; the fix aligned implementation with the existing schema contract.

## Issues Encountered

- Prisma Client generation required `DATABASE_URL`; reran `npx prisma generate` with the local dev database URL so generated types included Phase 6 fields.
- API integration tests emit an existing pg adapter deprecation warning about nested client queries. It does not fail the suite.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm run test -w apps/api -- quote-calculator` passed.
- `npm run test -w apps/api -- quote-calculator quote-contract` passed.
- `npm run typecheck -w apps/api` passed.
- `npm run lint -w apps/api` passed.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: authenticated-api | `apps/api/src/http/routes/quotes.ts` | New authenticated quote CRUD surface protected by quotes.read and quotes.write permissions. |
| threat_flag: tenant-operational-writes | `apps/api/src/quotes/quoteService.ts` | New tenant-scoped quote writes linking customer, vehicle, optional check-in, service catalog entries and products. |

## Next Phase Readiness

Ready for `06-03`: draft quote data, backend totals, warning metadata and tenant-safe API reads/writes are available for publication/versioning work.

## Self-Check: PASSED

- Found `apps/api/src/quotes/quoteCalculator.ts`.
- Found `apps/api/src/quotes/quoteService.ts`.
- Found `apps/api/src/http/routes/quotes.ts`.
- Found `apps/api/src/test/quote-calculator.test.ts`.
- Found `apps/api/src/test/quote-contract.test.ts`.
- Found task commits `7769a0f` and `767e2a7` in git history.
- All plan-level verification commands passed.

---
*Phase: 06-diagn-stico-e-or-amento*
*Completed: 2026-07-28*
