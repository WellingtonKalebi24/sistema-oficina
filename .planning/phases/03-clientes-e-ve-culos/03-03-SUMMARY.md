---
phase: 03-clientes-e-ve-culos
plan: 03
subsystem: ui
tags: [react, vite, typescript, customer-ui, vehicle-ui, permissions, docker]
requires:
  - phase: 02-autentica-o-tenant-e-permiss-es
    provides: "Authenticated shell, session storage, typed auth/admin clients and permission-aware menu patterns"
  - phase: 03-clientes-e-ve-culos
    provides: "Protected tenant-scoped customer and vehicle APIs with history, duplicate prevention, audit and isolation"
provides:
  - "Typed customer web API client for list/search, create, update, soft delete and history"
  - "Typed vehicle web API client for list/search, create, update, soft delete and history"
  - "Authenticated shell menus and compact workspaces for Clientes and Veiculos"
  - "UI coverage for customer/vehicle search, create/edit, soft delete confirmation, history rows, duplicate errors and server 403 states"
  - "Phase 3 setup notes, final verification and Docker smoke results"
affects: [phase-04, customer-ui, vehicle-ui, authenticated-shell, local-setup]
tech-stack:
  added: []
  patterns:
    - "Customer and vehicle records stay in React memory and are never persisted to browser localStorage."
    - "Operational menus are permission-aware for usability while backend 403 states remain authoritative."
    - "Typed web clients map backend duplicate errors into concise Portuguese operational messages."
key-files:
  created:
    - apps/web/src/api/customers.ts
    - apps/web/src/api/vehicles.ts
    - apps/web/src/test/customer-vehicle-ui.test.tsx
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/styles.css
    - docs/LOCAL_SETUP.md
key-decisions:
  - "Kept customer/vehicle UI inside the existing authenticated admin shell instead of introducing public pages or separate routing."
  - "Loaded customer and vehicle resources only when effective permissions include customers.read or vehicles.read, preserving existing admin test/API behavior."
  - "Used in-memory React state for customer and vehicle rows; localStorage remains limited to auth session data."
  - "Displayed API duplicate rules as backend-derived UI copy: active customer document, plate and VIN duplicates are blocked, while customer phone reuse is allowed."
patterns-established:
  - "Feature web clients reuse ApiError and VITE_API_BASE_URL with bearer headers and { data } envelopes."
  - "Operational CRUD panels pair a compact form with an active table, explicit destructive confirmation and a history section."
  - "UI tests mock fetch by method/path/query and assert absence of communication and marketing language."
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
    description: "Authenticated users with customers.read can search, create, edit, soft-delete and inspect history for active customers."
    requirement: CAV-01
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/customer-vehicle-ui.test.tsx#searches, creates, edits, soft-deletes and shows customer history"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- customer-vehicles"
        status: pass
    human_judgment: false
  - id: D2
    description: "Authenticated users with vehicles.read can search, create, edit, link, soft-delete and inspect history for active vehicles."
    requirement: CAV-02
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/customer-vehicle-ui.test.tsx#searches, creates, edits, links, soft-deletes and shows vehicle history"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- customer-vehicles"
        status: pass
    human_judgment: false
  - id: D3
    description: "Clientes and Veiculos menus live inside the authenticated shell and are keyed to customers.read and vehicles.read."
    requirement: CAV-09
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/customer-vehicle-ui.test.tsx#opens customer and vehicle menus inside the authenticated shell"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "Server 403 responses show the existing backend-permission blocked state and are not treated as frontend authorization proof."
    requirement: CAV-09
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/customer-vehicle-ui.test.tsx#shows empty and server-permission blocked states without treating the UI as authority"
        status: pass
      - kind: integration
        ref: "apps/api/src/test/customer-vehicles.test.ts#prevents tenant A from listing, reading, updating, deleting or linking tenant B records"
        status: pass
    human_judgment: false
  - id: D5
    description: "Phase 3 setup docs describe login, customer creation, vehicle linking, search, soft delete, duplicate rejection and final gates."
    verification:
      - kind: other
        ref: "docs/LOCAL_SETUP.md"
        status: pass
      - kind: other
        ref: "npm run db:migrate; npm run test -w apps/api -- customer-vehicles; npm run test -w apps/web -- customer-vehicle-ui App; npm run verify; npm run docker:config"
        status: pass
      - kind: other
        ref: "docker compose up --build -d db api web; docker compose ps; curl.exe http://localhost:3001/health; curl.exe -I http://localhost:5173"
        status: pass
    human_judgment: false
duration: 73min
completed: 2026-07-21
status: complete
---

# Phase 03 Plan 03: Authenticated Customer Vehicle UI Summary

**Authenticated customer and vehicle workspaces with typed web clients, compact CRUD tables, history rows, backend 403 states and Docker-verified Phase 3 gates.**

## Performance

- **Duration:** 73 min
- **Started:** 2026-07-21T00:43:30Z
- **Completed:** 2026-07-21T00:56:37Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added RED/GREEN UI coverage for `Clientes` and `Veiculos` menus, forms, searches, active tables, history rows, duplicate errors, empty states, soft-delete confirmation and backend 403 blocked states.
- Added typed customer and vehicle web clients using bearer auth, `VITE_API_BASE_URL`, `{ data }` envelopes, 204 delete handling and shared `ApiError` behavior.
- Extended the authenticated shell with compact operational customer and vehicle workspaces, using only in-memory React state for business records.
- Updated local setup docs with the Phase 3 smoke path and ran migration, targeted API tests, targeted web tests, root verify, Compose config and live Docker smoke.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED customer and vehicle UI tests** - `73bc094` (test)
2. **Task 2: Implement typed clients and authenticated customer/vehicle workspaces** - `64c9e67` (feat)
3. **Formatting cleanup after Task 3 gate failure** - `58d8d68` (style)
4. **Task 3: Run final Phase 3 verification and update setup docs** - `759fc7b` (docs)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/web/src/api/customers.ts` - Typed customer API client for list/search, create, update, soft delete and history.
- `apps/web/src/api/vehicles.ts` - Typed vehicle API client for list/search, create, update, soft delete and history.
- `apps/web/src/App.tsx` - Authenticated shell menus and compact customer/vehicle workspaces.
- `apps/web/src/styles.css` - Scoped customer/vehicle filter, table-action, confirmation and history styles.
- `apps/web/src/test/customer-vehicle-ui.test.tsx` - UI behavior coverage for CAV workflows and prohibited communication-language absence.
- `docs/LOCAL_SETUP.md` - Phase 3 local smoke and final validation notes.

## Decisions Made

- Kept the customer/vehicle UI in the authenticated shell, not public routes or a landing surface.
- Loaded customer/vehicle resources only for sessions with `customers.read` or `vehicles.read`, preserving existing admin UI behavior for users without CAV permissions.
- Kept customer and vehicle rows in component state only; browser storage remains limited to the existing auth session.
- Mapped backend duplicate responses to concise UI messages without exposing raw stack traces, tokens, full documents or VIN details.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted UI test fetch mock for repeated boot/list calls**
- **Found during:** Task 2 implementation
- **Issue:** A sequence-consuming fetch mock made reusable boot/list requests fail when React re-ran effects in the test environment.
- **Fix:** Consumed only duplicate route definitions, keeping single route definitions reusable while still allowing sequential POST duplicate-error tests.
- **Files modified:** `apps/web/src/test/customer-vehicle-ui.test.tsx`
- **Verification:** `npm run test -w apps/web -- customer-vehicle-ui App` passed.
- **Committed in:** `64c9e67`

**2. [Rule 3 - Blocking] Applied targeted Prettier formatting**
- **Found during:** Task 3 final verification
- **Issue:** `npm run verify` failed at `format:check` for `apps/web/src/api/customers.ts` and `apps/web/src/App.tsx`.
- **Fix:** Ran local Prettier on touched web and doc files, committing the actual changed files separately.
- **Files modified:** `apps/web/src/api/customers.ts`, `apps/web/src/App.tsx`
- **Verification:** Re-ran the full final gate; `npm run verify` passed.
- **Committed in:** `58d8d68`

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both fixes were required to complete the planned TDD and final verification gates. No packages, architecture changes or out-of-scope features were added.

## Issues Encountered

- The first live API curl ran too soon after Compose recreated the API container and returned `curl: (52) Empty reply from server`. After an 8-second startup wait, `curl.exe http://localhost:3001/health` returned `{"status":"ok","database":"connected","checkedAt":"2026-07-21T00:56:36.870Z"}` and the web returned `HTTP/1.1 200 OK`.
- This PowerShell version does not support `&&`, so the final gate was re-run with explicit `$LASTEXITCODE` checks after each command.

## Verification

| Check | Result |
|-------|--------|
| RED: `npm run test -w apps/web -- customer-vehicle-ui App` before implementation | Expected fail - `Clientes` and `Veiculos` menus/panels missing |
| `npm run test -w apps/web -- customer-vehicle-ui App` | Pass - 2 files, 7 tests |
| `npm run typecheck -w apps/web && npm run lint -w apps/web` | Pass |
| `$env:DATABASE_URL=...; npm run db:migrate` | Pass - Prisma already in sync |
| `npm run test -w apps/api -- customer-vehicles` | Pass - 5 API tests |
| `npm run verify` | Pass - format, lint, typecheck and all workspace tests |
| `npm run docker:config` | Pass - Compose config rendered for db/api/web |
| `docker compose up --build -d db api web` | Pass - API and web images rebuilt; db healthy; api/web started |
| `docker compose ps` | Pass - db healthy, api on `3001`, web on `5173` |
| `curl.exe http://localhost:3001/health` | Pass after startup wait - status ok, database connected |
| `curl.exe -I http://localhost:5173` | Pass - `HTTP/1.1 200 OK` |

## Auth Gates

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. Stub scan false positives were limited to form placeholders used as input hints, negative prohibited-language regexes in tests and test cleanup for auth localStorage.

## Threat Flags

None - the new browser customer/vehicle surface was in the plan threat model. It uses permission-aware menus for usability, backend 403 blocked states for authority, explicit destructive confirmation and no customer/vehicle localStorage persistence.

## Next Phase Readiness

Phase 4 can link catalog/stock workflows to the authenticated shell and the existing customer/vehicle typed client patterns. Phase 3 now has schema, backend APIs, UI workflows, tests, setup notes and Docker smoke verification.

## Self-Check: PASSED

- Found summary file at `.planning/phases/03-clientes-e-ve-culos/03-03-SUMMARY.md`.
- Found created/modified files: `apps/web/src/api/customers.ts`, `apps/web/src/api/vehicles.ts`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/src/test/customer-vehicle-ui.test.tsx`, `docs/LOCAL_SETUP.md`.
- Found task commits `73bc094`, `64c9e67`, `58d8d68` and `759fc7b` in git history.
- Confirmed final migration, targeted API tests, targeted web tests, root verify, Docker config and live Docker smoke passed.

---
*Phase: 03-clientes-e-ve-culos*
*Completed: 2026-07-21*
