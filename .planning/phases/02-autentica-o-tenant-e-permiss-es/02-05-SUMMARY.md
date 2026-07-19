---
phase: 02-autentica-o-tenant-e-permiss-es
plan: 05
subsystem: auth
tags: [express, permissions, tenancy, prisma, audit, zod]

requires:
  - phase: 02-autentica-o-tenant-e-permiss-es
    provides: Password/token/session services, bootstrap auth, sanitized audit writer and requireAuth middleware from 02-03 and 02-04
provides:
  - Stable permission namespace with admin-level permission classification
  - Effective permission resolver with deny-over-allow user overrides
  - Backend requirePermission middleware for protected admin actions
  - Tenant-scoped company settings, users, roles, permissions and override routes
  - Tenant relationship validation helpers for user/role/override writes
  - Admin audit events for settings, user lifecycle, role and override changes
affects: [phase-02-auth, api-admin, permissions, tenant-isolation, audit]

tech-stack:
  added: []
  patterns:
    - Protected admin routers mount after requireAuth and enforce per-route requirePermission checks.
    - User/role/override writes validate related IDs against req.auth.tenantId before mutation.
    - Admin-level grants are blocked unless the actor has users.createAdmin.

key-files:
  created:
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/permissions/permissionService.ts
    - apps/api/src/tenancy/tenantScope.ts
    - apps/api/src/http/middleware/requirePermission.ts
    - apps/api/src/http/routes/tenantSettings.ts
    - apps/api/src/http/routes/users.ts
    - apps/api/src/http/routes/roles.ts
    - apps/api/src/test/permissions.test.ts
    - apps/api/src/test/tenant-isolation.test.ts
  modified:
    - prisma/seed.ts
    - apps/api/src/app.ts
    - apps/api/src/http/routes/auth.ts
    - apps/api/src/http/routes/bootstrap.ts
    - apps/api/src/test/audit.test.ts
    - apps/api/src/test/testData.ts

key-decisions:
  - "Centralized permission keys in apps/api/src/permissions/permissions.ts and reused them from bootstrap, seed, tests and auth serialization."
  - "Kept the existing foundation/test routes public by mounting the new admin auth gate after those routes, preserving Phase 1/2 diagnostics while protecting admin APIs."
  - "Treated users.createAdmin as the admin-level grant gate for role permissions and allow overrides, while deny overrides do not require admin grant escalation."

patterns-established:
  - "Admin routes use req.auth.tenantId as the only tenant scope source; request tenantId query parameters are ignored."
  - "Multi-row user, role and override writes run inside Prisma transactions and append sanitized audit records."
  - "Permission resolution returns sorted effective permissions after role grants and user override evaluation."

requirements-completed:
  - IDT-01
  - IDT-02
  - IDT-03
  - IDT-04
  - IDT-10
  - IDT-11
  - IDT-12
  - IDT-13

coverage:
  - id: D1
    description: "Tenant admins can read and update company settings in their authenticated tenant."
    requirement: IDT-01
    verification:
      - kind: integration
        ref: "apps/api/src/test/permissions.test.ts#lets an authorized admin update settings and manage users, roles and overrides"
        status: pass
      - kind: integration
        ref: "apps/api/src/test/tenant-isolation.test.ts#prevents tenant A from reading or mutating tenant B users, roles, settings and overrides"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tenant admins can list, create, edit, deactivate and assign roles/overrides for users inside their tenant."
    requirement: IDT-02
    verification:
      - kind: integration
        ref: "apps/api/src/test/permissions.test.ts#lets an authorized admin update settings and manage users, roles and overrides"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- auth-bootstrap auth-sessions permissions tenant-isolation audit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Roles and permission assignments are configurable and admin-level grants require users.createAdmin."
    requirement: IDT-03
    verification:
      - kind: integration
        ref: "apps/api/src/test/permissions.test.ts#denies missing permissions and requires users.createAdmin for admin-level grants"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "User-specific allow/deny overrides affect effective permissions and explicit deny wins over role allow."
    requirement: IDT-04
    verification:
      - kind: integration
        ref: "apps/api/src/test/permissions.test.ts#applies explicit deny overrides over role allows"
        status: pass
    human_judgment: false
  - id: D5
    description: "Backend requirePermission blocks authenticated users who lack required permissions."
    requirement: IDT-11
    verification:
      - kind: integration
        ref: "apps/api/src/test/permissions.test.ts#denies missing permissions and requires users.createAdmin for admin-level grants"
        status: pass
    human_judgment: false
  - id: D6
    description: "Tenant A cannot list, update, deactivate, assign roles to or override permissions for Tenant B records."
    requirement: IDT-12
    verification:
      - kind: integration
        ref: "apps/api/src/test/tenant-isolation.test.ts#prevents tenant A from reading or mutating tenant B users, roles, settings and overrides"
        status: pass
    human_judgment: false
  - id: D7
    description: "Tenant settings, user lifecycle, role and override changes are audited without submitted passwords."
    requirement: IDT-13
    verification:
      - kind: integration
        ref: "apps/api/src/test/audit.test.ts#records tenant admin events without storing submitted passwords"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-19
status: complete
---

# Phase 02 Plan 05: Permission Administration Summary

**Tenant-scoped admin APIs with deny-over-allow permission resolution, users.createAdmin grant control and audited settings/user/role changes.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-19T12:16:59Z
- **Completed:** 2026-07-19T12:28:40Z
- **Tasks:** 2 completed
- **Files modified:** 16

## Accomplishments

- Added RED backend tests for tenant settings, user lifecycle, configurable roles, permission overrides, admin grant blocking, tenant isolation and admin audit.
- Implemented stable permission constants, effective permission resolution with deny-over-allow, and reusable `requirePermission`.
- Added protected tenant settings, users and roles routes that derive tenant scope only from `req.auth.tenantId`.
- Added transactional user/role/override writes with tenant relationship validation and sanitized audit logs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED permission, admin and isolation tests** - `18b5f94` (test)
2. **Task 2: Implement permissions, tenant scope and admin routes** - `f6418a7` (feat)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/api/src/permissions/permissions.ts` - Stable dot-key permission namespace and admin-level permission classification.
- `apps/api/src/permissions/permissionService.ts` - Effective permission resolver and permission predicate.
- `apps/api/src/tenancy/tenantScope.ts` - Tenant-owned user/role validation helpers.
- `apps/api/src/http/middleware/requirePermission.ts` - Backend permission middleware.
- `apps/api/src/http/routes/tenantSettings.ts` - Tenant-scoped company settings read/update routes.
- `apps/api/src/http/routes/users.ts` - Tenant-scoped user lifecycle, role assignment and override routes.
- `apps/api/src/http/routes/roles.ts` - Permission catalog and role creation/listing routes.
- `apps/api/src/app.ts` - Mounts protected admin routers behind `requireAuth`.
- `apps/api/src/http/routes/auth.ts` - Reuses shared effective permission resolver for auth responses.
- `apps/api/src/http/routes/bootstrap.ts` and `prisma/seed.ts` - Reuse shared permission constants/details.
- `apps/api/src/test/permissions.test.ts` - Admin permission and override integration coverage.
- `apps/api/src/test/tenant-isolation.test.ts` - Cross-tenant admin API isolation coverage.
- `apps/api/src/test/audit.test.ts` - Admin audit and secret absence assertions.
- `apps/api/src/test/testData.ts` - Shared permission constants in fixtures.

## Verification

| Check | Result |
|-------|--------|
| RED: `npm run test -w apps/api -- permissions tenant-isolation audit` before implementation | Expected fail - admin endpoints returned 404/403 gaps |
| `npm run test -w apps/api -- permissions tenant-isolation audit && npm run typecheck -w apps/api` | Pass - 6 admin/tenant/audit tests passed and API typecheck passed |
| `npm run test -w apps/api -- auth-bootstrap auth-sessions permissions tenant-isolation audit && npm run typecheck -w apps/api` | Pass - 14 targeted Phase 2 API tests passed and API typecheck passed |
| `npm run verify` | Pass - format, lint, typecheck and workspace tests passed; web suite 5 tests, API suite 21 tests |

## Decisions Made

- Used shared permission constants for seed, bootstrap, auth serialization and admin route validation to avoid drift in permission key spelling.
- Mounted the new admin `requireAuth` gate after health/bootstrap/auth/foundation/test routes so existing public diagnostics remain stable while admin APIs are protected.
- Required `users.createAdmin` only when granting admin-level permissions through roles or allow overrides; regular user creation still requires `users.create`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved existing public foundation and test routes**
- **Found during:** Overall verification after Task 2
- **Issue:** Mounting `requireAuth` before the existing foundation/test routes changed prior public route behavior to 401, breaking `apps/api/src/test/app.test.ts`.
- **Fix:** Moved `createFoundationChecksRouter` and the test-only forced-error route before the protected admin router mount.
- **Files modified:** `apps/api/src/app.ts`
- **Verification:** `npm run verify` passed after the fix.
- **Committed in:** `f6418a7`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix preserved prior behavior while keeping all new admin routes protected. No scope expansion.

## Issues Encountered

- Initial role creation used a Prisma nested/scalar relation shape that failed at runtime and typecheck; it was corrected to resolve permission IDs and write role-permission rows inside the same transaction.
- Express route params needed explicit narrowing under the current strict TypeScript config; admin user route handlers now validate path params before tenant checks.
- Prettier reported formatting differences in three touched files; targeted formatting was applied before final verification.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - the new authenticated admin API and tenant boundary are covered by the plan threat model and integration tests.

## Next Phase Readiness

Ready for `02-06-PLAN.md`: backend-authenticated admin APIs are available for the UI to consume, with permission lists, company settings, user management, role creation and user override behavior enforced server-side.

## Self-Check: PASSED

- Found summary file at `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-05-SUMMARY.md`.
- Found task commits `18b5f94` and `f6418a7` in git history.
- Confirmed targeted Phase 2 API validation and full `npm run verify` passed.

---
*Phase: 02-autentica-o-tenant-e-permiss-es*
*Completed: 2026-07-19*
