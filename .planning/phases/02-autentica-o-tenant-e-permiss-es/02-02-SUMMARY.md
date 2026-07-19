---
phase: 02-autentica-o-tenant-e-permiss-es
plan: 02
subsystem: database
tags: [prisma, postgres, tenant, identity, permissions, sessions, audit, tdd]

requires:
  - phase: 02-autentica-o-tenant-e-permiss-es
    provides: Approved Phase 2 auth/admin dependency surface from 02-01
provides:
  - Phase 2 identity, tenant, permission, session, reset-token and audit Prisma schema contract
  - Versioned PostgreSQL migration for the identity schema
  - Deterministic permission seed keys and default role templates
  - RED bootstrap and session tests for the next auth route plan
affects: [phase-02-auth, api-auth, prisma-schema, tenant-isolation, permissions]

tech-stack:
  added: []
  patterns:
    - Tenant-scoped Prisma models with snake_case table/column mapping for Phase 2 identity data
    - Persisted sessions store hashed opaque refresh token secrets only
    - API integration tests that serialize files against the shared PostgreSQL database

key-files:
  created:
    - apps/api/src/test/auth-bootstrap.test.ts
    - apps/api/src/test/auth-sessions.test.ts
    - apps/api/src/test/testData.ts
    - apps/api/vitest.config.ts
    - prisma/migrations/20260719114626_add_identity_tenant_permissions/migration.sql
    - prisma/migrations/migration_lock.toml
    - .planning/phases/02-autentica-o-tenant-e-permiss-es/02-02-SUMMARY.md
  modified:
    - apps/api/src/test/prisma-baseline.test.ts
    - prisma/schema.prisma
    - prisma/seed.ts

key-decisions:
  - "Modeled Phase 2 identity data in one Prisma migration so later auth/admin plans can implement routes and services without schema churn."
  - "Seeded only stable permission keys and default role metadata; no tenant-specific roles or business entities are created by the seed."
  - "Configured API Vitest file execution serially because integration tests share one PostgreSQL schema and perform table cleanup."

patterns-established:
  - "Permission keys are stable dot-keys: tenant.settings.read, tenant.settings.update, users.read, users.create, users.update, users.deactivate, users.createAdmin, roles.manage, permissions.manage and audit.read."
  - "Sessions include refreshTokenHash, expiration, revocation metadata, user agent and IP metadata, but never persist raw refresh token secrets."
  - "Schema baseline tests assert required identity models while rejecting customer, vehicle, stock, quote, work order, finance and communication entity families."

requirements-completed:
  - IDT-01
  - IDT-03
  - IDT-04
  - IDT-05
  - IDT-06
  - IDT-07
  - IDT-10

coverage:
  - id: D1
    description: "Phase 2 Prisma identity schema contains tenant, company settings, user, role, permission, role grant, user override, session, password reset token and audit log models."
    requirement: IDT-01
    verification:
      - kind: integration
        ref: "apps/api/src/test/prisma-baseline.test.ts#contains the Phase 2 identity, tenant, session, permission and audit contract"
        status: pass
      - kind: other
        ref: "npm run db:migrate"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deterministic seed creates the ten required Phase 2 permission keys without creating business or communication entities."
    requirement: IDT-03
    verification:
      - kind: other
        ref: "npm run db:seed && SELECT key FROM permissions ORDER BY key"
        status: pass
    human_judgment: false
  - id: D3
    description: "RED bootstrap and multi-session route tests describe first-tenant bootstrap lock, concurrent sessions, refresh rotation and current-session logout."
    requirement: IDT-06
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- prisma-baseline auth-bootstrap auth-sessions (expected RED: auth routes return 404 for Plan 03)"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-07-19
status: complete
---

# Phase 02 Plan 02: Identity Schema and RED Auth Contract Summary

**Prisma identity schema with tenant-scoped users, configurable permissions, hashed refresh sessions, reset tokens, audit logs and RED auth route contracts.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-07-19T08:14:00-03:00
- **Completed:** 2026-07-19T08:49:13-03:00
- **Tasks:** 2 completed
- **Files modified:** 10

## Accomplishments

- Added RED tests and fixtures for Phase 2 identity bootstrap, multi-session refresh rotation, current-session logout and schema baseline assertions.
- Added Prisma models for `Tenant`, `CompanySetting`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `UserPermissionOverride`, `Session`, `PasswordResetToken` and `AuditLog`.
- Created and applied versioned migration `20260719114626_add_identity_tenant_permissions`.
- Updated seed data with deterministic permission keys and default role template metadata only.
- Confirmed no customer, vehicle, stock, quote, work order, finance, notification, WhatsApp, SMS or customer communication entities were introduced.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Add RED schema and fixture tests** - `fbe4c91` (test)
2. **Task 2: Implement identity schema, seed and migration** - `d6ea08b` (feat)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/api/src/test/testData.ts` - Reusable identity cleanup, tenant/admin, user/role, login and audit fixture helpers.
- `apps/api/src/test/prisma-baseline.test.ts` - Phase 2 schema baseline and forbidden entity checks.
- `apps/api/src/test/auth-bootstrap.test.ts` - RED bootstrap route contract.
- `apps/api/src/test/auth-sessions.test.ts` - RED multi-session, refresh rotation and logout route contract.
- `apps/api/vitest.config.ts` - Serializes API test files for shared PostgreSQL integration tests.
- `prisma/schema.prisma` - Phase 2 identity, tenant, permission, session, reset token and audit models.
- `prisma/migrations/20260719114626_add_identity_tenant_permissions/migration.sql` - Versioned PostgreSQL migration.
- `prisma/migrations/migration_lock.toml` - Prisma migration provider lock.
- `prisma/seed.ts` - Deterministic permission seed and default role template metadata.

## Verification

| Check | Result |
|-------|--------|
| `npm run db:migrate` | Pass - database already in sync after migration creation |
| `npm run test -w apps/api -- prisma-baseline` | Pass - 3 tests passed |
| `npm run test -w apps/api -- prisma-baseline auth-bootstrap auth-sessions` | Expected RED - schema baseline passed; bootstrap/login/session route tests failed with 404 because routes are planned for 02-03 |
| `npm run typecheck -w apps/api` | Pass |
| `npm run lint -w apps/api` | Pass |
| `npm run db:seed` and permission key query | Pass - 10 expected permission keys present |
| Forbidden entity scan | Pass - matches only plan/test forbidden-name assertions, no forbidden Prisma models |

## Decisions Made

- Kept password/session/reset implementation out of this schema plan; route/service behavior remains RED for 02-03 as planned.
- Used tenant-scoped roles and users with compound uniqueness on tenant-owned keys/emails.
- Stored only hashed refresh token and reset code material in persistent models.
- Used nullable tenant/user links on audit logs with `SetNull` delete behavior so audit rows are not cascaded away with account cleanup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Serialized API integration test files**
- **Found during:** Task 2
- **Issue:** Auth bootstrap and session test files both clean shared identity tables; Vitest file parallelism caused false foreign-key failures unrelated to the schema contract.
- **Fix:** Added `apps/api/vitest.config.ts` with `fileParallelism: false` for API tests.
- **Files modified:** `apps/api/vitest.config.ts`
- **Verification:** Targeted suite no longer has cross-file cleanup failures; remaining RED failures are missing auth routes.
- **Committed in:** `d6ea08b`

---

**Total deviations:** 1 auto-fixed (1 blocking test-infrastructure issue).
**Impact on plan:** No product scope change. The config makes shared-database integration tests deterministic.

## Issues Encountered

- The first Prisma migration command was invoked through the npm wrapper incorrectly and prompted for a migration name. The abandoned prompt held PostgreSQL advisory locks; stale local dev lock backends were terminated with `pg_terminate_backend`, then `npx prisma migrate dev --name add_identity_tenant_permissions` succeeded.
- The combined auth test command remains intentionally RED for bootstrap/login/session routes. This is the planned handoff to 02-03, not a schema failure.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - the only new trust-boundary surface is the planned tenant-scoped identity/session/audit database schema.

## Next Phase Readiness

Ready for `02-03-PLAN.md`: Prisma identity models, permission seed data, RED bootstrap/session tests and fixture helpers are in place for implementing bootstrap, login, refresh and logout routes.

## Self-Check: PASSED

- Found summary file at `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-02-SUMMARY.md`.
- Found task commits `fbe4c91` and `d6ea08b` in git history.
- Confirmed `npm run db:migrate`, `npm run test -w apps/api -- prisma-baseline`, `npm run typecheck -w apps/api`, `npm run lint -w apps/api` and `npm run db:seed` passed.
- Confirmed combined auth command is expected RED only for missing 02-03 auth routes.

---
*Phase: 02-autentica-o-tenant-e-permiss-es*
*Completed: 2026-07-19*
