---
phase: 04-servi-os-produtos-compras-e-estoque
plan: 04
subsystem: ui
tags: [react, vite, typescript, stock, inventory, vitest]
requires:
  - phase: 04-servi-os-produtos-compras-e-estoque
    provides: stock catalog, purchase, movement, reservation and availability APIs
provides:
  - Typed stock web API client for service, category, product, supplier, purchase, movement and reservation endpoints.
  - Authenticated Estoque workspace with Servicos, Produtos, Fornecedores, Compras, Movimentos, Reservas and Alertas areas.
  - UI tests for stock tabs, required markers, backend blocked states, low-stock visual copy and permissive vehicle registration guard.
  - Final Phase 4 verification across targeted stock API tests, stock UI tests and root verify.
affects: [05-agenda-recepcao, quotes, work-orders, dashboard, stock-ui]
tech-stack:
  added: []
  patterns:
    - React admin shell stock workspace reuses bearer/no-cache API clients and backend 403 blocked-state handling.
    - Stock action handlers call backend endpoints, refresh server stock state and keep purchase rows in local session memory until a purchase list API exists.
    - Low-stock state is rendered as calculated visual badges/rows only, with no communication surface.
key-files:
  created:
    - apps/web/src/api/stock.ts
    - apps/web/src/test/stock-ui.test.tsx
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/styles.css
    - apps/api/src/http/routes/stockCatalog.ts
    - apps/api/src/http/routes/stockMovements.ts
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/stock/stockSchemas.ts
    - apps/api/src/test/customer-vehicles.test.ts
    - apps/api/src/test/prisma-baseline.test.ts
    - apps/api/src/test/stock-concurrency.test.ts
    - apps/api/src/test/stock-contract.test.ts
key-decisions:
  - "The Estoque workspace uses existing admin shell primitives and Font Awesome navigation instead of introducing a new UI library."
  - "Purchase rows created from the UI are retained in browser memory because Phase 4 backend exposes purchase creation but not a purchase list endpoint; stock balances and movements still refresh from backend data."
  - "Vehicle form validation was left permissive; only stock-specific required markers and aria labels were added."
patterns-established:
  - "Stock UI read loading is permission-aware but backend 401/403 remains authoritative through shared ApiError handling."
  - "Critical stock actions refresh products, movement history and reservations from server data after successful writes."
requirements-completed: [STK-01, STK-02, STK-03, STK-04, STK-05, STK-06, STK-07, STK-08, STK-09, STK-10, STK-11, STK-12, STK-14]
coverage:
  - id: D1
    description: "Authenticated Estoque navigation and seven operational work areas are exposed in the admin shell."
    requirement: STK-01
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/stock-ui.test.tsx#D-09 exposes Estoque work areas with required markers and stock quantities"
        status: pass
    human_judgment: false
  - id: D2
    description: "Product UI shows physical, reserved, available and minimum quantities plus calculated low-stock visual alerts."
    requirement: STK-09
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/stock-ui.test.tsx#D-09 exposes Estoque work areas with required markers and stock quantities"
        status: pass
    human_judgment: false
  - id: D3
    description: "Purchase, exit, adjustment, reservation and cancellation actions call backend endpoints and refresh server state."
    requirement: STK-04
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/stock-ui.test.tsx#D-07 submits purchase, movement and reservation actions without communication surfaces"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- stock-contract stock-concurrency"
        status: pass
    human_judgment: false
  - id: D4
    description: "Backend 403 stock responses render the server-permission blocked state."
    requirement: STK-14
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/stock-ui.test.tsx#D-03 renders server 403 as the authoritative stock blocked state"
        status: pass
    human_judgment: false
  - id: D5
    description: "Vehicle registration remains permissive while stock forms add required markers."
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/stock-ui.test.tsx#D-08 keeps vehicle registration permissive while stock UI adds required markers"
        status: pass
    human_judgment: false
duration: 32min
completed: 2026-07-22
status: complete
---

# Phase 04 Plan 04: Authenticated Stock UI Summary

**Authenticated Estoque workspace with typed stock API client, operational stock actions, visual low-stock alerts and Phase 4 verification gates.**

## Performance

- **Duration:** 32min
- **Started:** 2026-07-22T15:40:00Z
- **Completed:** 2026-07-22T16:12:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Added typed stock web API client wrappers for catalog, supplier, purchase, movement and reservation endpoints using bearer auth and `{ data }` envelopes.
- Added an authenticated Estoque workspace in the existing admin shell with tabs for Servicos, Produtos, Fornecedores, Compras, Movimentos, Reservas and Alertas.
- Wired product/category/service/supplier creation, purchase entry, stock exit, adjustment, reservation and cancellation to backend endpoints with post-action server refresh.
- Added stock UI tests covering tabs, required markers, backend 403 blocked state, low-stock visual copy, critical actions and no vehicle validation regression.
- Ran final Phase 4 verification: targeted stock API tests, targeted stock UI tests and root `npm run verify`.

## Task Commits

1. **Task 1: Add stock web client and UI contract tests** - `698c7e8` (test)
2. **Task 2: Implement the authenticated Estoque workspace** - `20725e2` (feat)
3. **Task 3: Run final Phase 4 verification** - `facab50` (style)

## Files Created/Modified

- `apps/web/src/api/stock.ts` - Typed stock API client with no-store bearer requests and safe operator error messages.
- `apps/web/src/test/stock-ui.test.tsx` - Stock UI contract tests and vehicle permissiveness regression guard.
- `apps/web/src/App.tsx` - Estoque navigation, resource loading, action handlers, forms, tables, low-stock alerts and blocked states.
- `apps/web/src/styles.css` - Scoped stock workspace tabs, grid, warning badge, numeric cells and alert row styling.
- Phase 4 API/test files listed in frontmatter - Prettier-only formatting required for root verification.

## Decisions Made

- Kept Phase 4 UI inside the existing React admin shell and local primitives; no package install or UI library change was introduced.
- Retained created purchase rows in memory because the current backend has purchase creation but no purchase list endpoint. Product balances, reservations and movement history still refresh from backend data after critical actions.
- Preserved permissive vehicle registration exactly: customer link remains required; plate, brand, model and VIN remain optional.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved created reservation row after server refresh**
- **Found during:** Task 2
- **Issue:** The UI discarded the created reservation response and relied only on immediate refresh state, which could hide the cancel action in the same interaction.
- **Fix:** Kept the just-created active reservation in local state after refreshing backend stock data.
- **Files modified:** `apps/web/src/App.tsx`
- **Verification:** `npm run test -w apps/web -- stock-ui` passed.
- **Committed in:** `20725e2`

**2. [Rule 3 - Blocking] Applied Prettier to Phase 4 verification files**
- **Found during:** Task 3
- **Issue:** Root `npm run verify` failed at `format:check` for Phase 4 API/web files.
- **Fix:** Ran Prettier on exactly the reported files and reran final verification.
- **Files modified:** Phase 4 API/test files plus `apps/web/src/App.tsx` and `apps/web/src/test/stock-ui.test.tsx`
- **Verification:** `npm run verify` passed.
- **Committed in:** `facab50`

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required for the planned UI behavior and quality gate. No package installs, communication surfaces or vehicle validation changes were introduced.

## Issues Encountered

- Initial RED stock UI tests failed because the Estoque nav/workspace did not exist, as expected for Task 1.
- First root verification failed on formatting only; after scoped Prettier, all gates passed.

## Known Stubs

None. Stub scan hits were optional/default values or normal input placeholder attributes; they do not block Phase 4 behavior.

## Threat Flags

None. The plan threat model covered the browser-to-API and critical stock action surfaces; implementation relies on backend authorization and displays server 403 states.

## User Setup Required

None - no external service configuration or package installation required.

## Verification

- `npm run test -w apps/web -- stock-ui`: passed, 1 file / 4 tests.
- `npm run typecheck -w apps/web`: passed.
- `npm run lint -w apps/web`: passed.
- `npm run test -w apps/api -- stock-contract stock-concurrency`: passed, 2 files / 12 tests.
- `npm run verify`: passed, including root format check, lint, typecheck and all workspace tests.

## Self-Check: PASSED

- Found key created files `apps/web/src/api/stock.ts` and `apps/web/src/test/stock-ui.test.tsx`.
- Found task commits `698c7e8`, `20725e2` and `facab50`.
- Confirmed no tracked-file deletions were introduced by task commits.

## Next Phase Readiness

Phase 5 can consume the existing authenticated shell, customer/vehicle data and completed stock UI/API surface. Later quote and work-order phases can link reservations to concrete source entities when those tables exist.

---
*Phase: 04-servi-os-produtos-compras-e-estoque*
*Completed: 2026-07-22*
