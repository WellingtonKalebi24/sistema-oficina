---
phase: 02-autentica-o-tenant-e-permiss-es
plan: 03
subsystem: auth
tags: [express, auth, jwt, argon2, jose, zod, sessions, prisma]

requires:
  - phase: 02-autentica-o-tenant-e-permiss-es
    provides: Phase 2 identity, tenant, permission, session and audit Prisma schema from 02-02
provides:
  - Argon2id password hashing and verification helpers
  - jose signed access-token helpers with issuer, audience, subject, tenant and session claims
  - Opaque browser-managed refresh-token sessions stored only as server-side hashes
  - First-admin bootstrap routes with transactional tenant, company settings, admin role, permission grants and audit event creation
  - Login, refresh, current-session logout and current-user auth routes
affects: [phase-02-auth, api-auth, tenant-isolation, sessions, permissions, audit]

tech-stack:
  added: []
  patterns:
    - Short-lived signed access JWT plus persisted hashed opaque refresh session
    - No refresh cookies in Phase 2; clients submit refresh tokens in JSON bodies
    - Root verification delegates to workspace test scripts so API DB tests keep their serial Vitest config

key-files:
  created:
    - apps/api/src/auth/passwords.ts
    - apps/api/src/auth/tokens.ts
    - apps/api/src/auth/sessions.ts
    - apps/api/src/http/routes/bootstrap.ts
    - apps/api/src/http/routes/auth.ts
    - .planning/phases/02-autentica-o-tenant-e-permiss-es/02-03-SUMMARY.md
  modified:
    - .env.example
    - apps/api/src/config/env.ts
    - apps/api/src/http/errors.ts
    - apps/api/src/app.ts
    - apps/api/src/test/auth-sessions.test.ts
    - apps/api/src/test/testData.ts
    - package.json

key-decisions:
  - "Implemented Phase 2 refresh sessions as opaque browser-managed tokens submitted in JSON, not cookies, to match the resolved research contract and avoid cookie CSRF scope in this slice."
  - "Kept auth failure responses generic through shared unauthorized helpers and route-level validation failures returning 401 for login/refresh/current-user auth probes."
  - "Kept the existing RED handoff route `/auth/bootstrap` while also adding the plan-stated `/bootstrap/status` and `/bootstrap/create-first-admin` endpoints."
  - "Changed the root `npm run test` script to run workspace test scripts so full verification preserves the API workspace serial database-test configuration."

patterns-established:
  - "Auth route factories accept injected Prisma and environment config, matching existing app composition patterns."
  - "Effective permissions are returned as stable dot-key arrays derived from roles and user-specific allow/deny overrides."
  - "Auth audit payloads include event metadata but never password, refresh token or access token material."

requirements-completed:
  - IDT-01
  - IDT-05
  - IDT-06
  - IDT-07
  - IDT-10

coverage:
  - id: D1
    description: "First admin bootstrap creates tenant, company settings, admin user, admin role, permission grants and sanitized audit metadata, then rejects a second bootstrap."
    requirement: IDT-01
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-bootstrap.test.ts#auth bootstrap"
        status: pass
      - kind: other
        ref: "npm run test -w apps/api -- auth-bootstrap auth-sessions"
        status: pass
    human_judgment: false
  - id: D2
    description: "Login verifies Argon2id password hashes, creates independent active sessions and returns sanitized profile, access token and opaque refresh token data."
    requirement: IDT-05
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-sessions.test.ts#allows two active sessions for the same user"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "Refresh rotates only the active session refresh secret while preserving other active sessions."
    requirement: IDT-06
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-sessions.test.ts#refresh rotates only the active session refresh secret"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "Logout revokes only the bearer/current session and does not invalidate another session for the same user."
    requirement: IDT-07
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-sessions.test.ts#logout revokes only the current session"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false
  - id: D5
    description: "Current-user lookup rejects missing authentication and returns sanitized session/user data for an active bearer session."
    requirement: IDT-10
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-sessions.test.ts#returns sanitized current-user data only for an active bearer session"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-19
status: complete
---

# Phase 02 Plan 03: Core Auth Routes and Session Services Summary

**Tenant-aware bootstrap and auth routes using Argon2id passwords, jose access tokens and hashed opaque refresh-session rotation.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-19T11:53:04Z
- **Completed:** 2026-07-19T12:02:00Z
- **Tasks:** 2 completed
- **Files modified:** 12

## Accomplishments

- Added auth environment parsing for JWT issuer/audience/secret, access-token TTL, refresh-token TTL and auth rate-limit settings.
- Added Argon2id password helpers, jose access-token helpers and persisted refresh-session helpers that never store raw refresh tokens.
- Added transactional bootstrap for the first tenant/admin with company settings, admin role, permission grants and sanitized audit metadata.
- Added login, refresh, logout and current-user routes with generic auth failures and no refresh cookies.
- Converted the carried-over RED auth tests to green and added coverage for sanitized `/auth/me` behavior.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Implement password, token and session services** - `50060ab` (feat)
2. **Task 2: Implement bootstrap and auth routes** - `a4ec6e0` (feat)
3. **Verification fix: Preserve API test isolation in root verify** - `be3e124` (fix)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/api/src/auth/passwords.ts` - Argon2id password hash and verify helpers.
- `apps/api/src/auth/tokens.ts` - jose access-token signing and verification helpers.
- `apps/api/src/auth/sessions.ts` - Opaque refresh-token creation, hashing, rotation, lookup and revocation helpers.
- `apps/api/src/http/routes/bootstrap.ts` - Bootstrap status and first-admin creation routes.
- `apps/api/src/http/routes/auth.ts` - Login, refresh, logout and current-user routes.
- `apps/api/src/app.ts` - Mounts bootstrap and auth routes in the Express app.
- `apps/api/src/config/env.ts` - Adds auth/JWT/rate-limit environment parsing.
- `apps/api/src/http/errors.ts` - Adds generic unauthorized and forbidden helpers.
- `apps/api/src/test/auth-sessions.test.ts` - Adds current-user auth probe coverage.
- `apps/api/src/test/testData.ts` - Uses real Argon2 password hashes in identity fixtures.
- `.env.example` - Documents local auth configuration variables.
- `package.json` - Runs workspace test scripts from the root verification command.

## Verification

| Check | Result |
|-------|--------|
| RED: `npm run test -w apps/api -- auth-bootstrap auth-sessions` before implementation | Expected fail - 5 tests failed with 404 for missing routes |
| `npm run typecheck -w apps/api` after Task 1 | Pass |
| `npm run test -w apps/api -- auth-bootstrap auth-sessions && npm run typecheck -w apps/api` after Task 2 | Pass - 6 auth tests passed |
| `npm run lint -w apps/api` | Pass |
| `npm run db:migrate` | Pass - database already in sync |
| `npm run verify` | Pass - format, lint, typecheck and workspace tests passed |

## Decisions Made

- Used SHA-256 hashes for opaque refresh-token lookup because the token secret is random high-entropy material and the database must find the matching active session without storing the raw token.
- Kept bootstrap compatibility with the existing `/auth/bootstrap` RED test contract while also exposing the plan-stated `/bootstrap/status` and `/bootstrap/create-first-admin` endpoints.
- Left password reset, permission-management routes and user-management routes to later Phase 2 plans; no notification or customer communication surface was added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preserved API test isolation during root verification**
- **Found during:** Plan-level verification
- **Issue:** Root `npm run verify` invoked `vitest run` from the repository root, bypassing `apps/api/vitest.config.ts`. API integration tests that clean shared PostgreSQL identity tables could overlap and fail with foreign-key errors.
- **Fix:** Changed the root `test` script to `npm run test --workspaces --if-present`, so each workspace runs with its own config.
- **Files modified:** `package.json`
- **Verification:** `npm run verify` passed.
- **Committed in:** `be3e124`

**2. [Rule 3 - Blocking] Matched the committed RED bootstrap route contract**
- **Found during:** Task 2
- **Issue:** The plan named `/bootstrap/create-first-admin`, while the committed 02-02 RED tests exercised `/auth/bootstrap`.
- **Fix:** Implemented both `/auth/bootstrap` and `/bootstrap/create-first-admin`, plus `/bootstrap/status`, through the same bootstrap router/service behavior.
- **Files modified:** `apps/api/src/http/routes/bootstrap.ts`
- **Verification:** `npm run test -w apps/api -- auth-bootstrap auth-sessions` passed.
- **Committed in:** `a4ec6e0`

---

**Total deviations:** 2 auto-fixed (2 blocking issues).
**Impact on plan:** No scope expansion beyond the approved auth slice; both fixes were required for executable verification and compatibility with the previous plan's RED contract.

## Issues Encountered

- Prettier formatting failed during the first full `npm run verify`; running the formatter on changed files resolved it and the final verify passed.

## User Setup Required

None - local/test auth defaults are documented in `.env.example`. Production must provide a real `JWT_ACCESS_SECRET` of at least 32 characters.

## Known Stubs

None.

## Threat Flags

None - the new public auth endpoints, token/session storage and PostgreSQL persistence are the trust boundaries covered by the plan threat model.

## Next Phase Readiness

Ready for `02-04-PLAN.md`: the API now has a tenant-aware authenticated identity context through login, refresh, logout and current-user lookup. Later admin/user/permission routes can build on the effective permission keys returned by the auth layer.

## Self-Check: PASSED

- Found summary file at `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-03-SUMMARY.md`.
- Found key auth service and route files in `apps/api/src/auth` and `apps/api/src/http/routes`.
- Found implementation commits `50060ab`, `a4ec6e0` and `be3e124` in git history.
- Confirmed `npm run db:migrate`, targeted auth tests and `npm run verify` passed.

---
*Phase: 02-autentica-o-tenant-e-permiss-es*
*Completed: 2026-07-19*
