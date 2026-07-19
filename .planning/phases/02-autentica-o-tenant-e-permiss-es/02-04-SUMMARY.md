---
phase: 02-autentica-o-tenant-e-permiss-es
plan: 04
subsystem: auth
tags: [express, auth, password-reset, audit, smtp, middleware, prisma]

requires:
  - phase: 02-autentica-o-tenant-e-permiss-es
    provides: Phase 2 schema, bootstrap, login, refresh, logout and current-user auth routes from 02-02 and 02-03
provides:
  - Single-use password reset request and completion by code sent to the registered email address
  - Authenticated change-password route with current password verification
  - Auth-scoped EmailSender abstraction with fake test sender and env-gated SMTP adapter
  - Sanitized audit writer for auth lifecycle metadata
  - Reusable requireAuth middleware context resolver for protected backend routes
affects: [phase-02-auth, api-auth, audit, smtp-recovery, protected-routes]

tech-stack:
  added: []
  patterns:
    - Auth recovery email is isolated behind EmailSender and scoped only to password reset
    - Audit metadata is sanitized centrally by dropping secret-shaped keys before persistence
    - requireAuth resolves bearer JWT claims against an active, unrevoked session and active user

key-files:
  created:
    - apps/api/src/audit/auditService.ts
    - apps/api/src/auth/passwordReset.ts
    - apps/api/src/http/middleware/requireAuth.ts
    - apps/api/src/mail/emailSender.ts
    - apps/api/src/types/nodemailer.d.ts
    - apps/api/src/test/audit.test.ts
  modified:
    - .env.example
    - apps/api/src/app.ts
    - apps/api/src/config/env.ts
    - apps/api/src/http/routes/auth.ts
    - apps/api/src/http/routes/bootstrap.ts
    - apps/api/src/test/auth-sessions.test.ts
    - apps/api/src/test/testData.ts

key-decisions:
  - "Kept EmailSender narrowly scoped to authentication password recovery; no customer notification, communication module, queue or delivery/read tracking was introduced."
  - "Stored password reset codes only as SHA-256 hashes of normalized email plus six-digit code, with short TTL and single-use consumption."
  - "Centralized auth audit redaction in writeAuditLog by dropping metadata keys shaped like passwords, tokens, reset codes, hashes or secrets before persistence."
  - "Added a local narrow Nodemailer declaration instead of installing another package during execution, avoiding an unplanned package-legitimacy gate."

patterns-established:
  - "Auth routes receive EmailSender via app dependency injection, allowing fake senders in tests and env-gated SMTP in runtime."
  - "Protected route middleware should use resolveAuthContext/requireAuth rather than reimplementing bearer parsing and session lookup."
  - "Audit tests assert literal submitted secrets are absent from persisted audit rows."

requirements-completed:
  - IDT-08
  - IDT-09
  - IDT-10
  - IDT-13

coverage:
  - id: D1
    description: "Password reset request returns a generic accepted response, sends one auth recovery code only for a registered email, completes with that code, changes the password and rejects code reuse."
    requirement: IDT-08
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-sessions.test.ts#requests and completes password reset using a single-use code sent to registered email"
        status: pass
      - kind: other
        ref: "npm run test -w apps/api -- auth-sessions audit && npm run typecheck -w apps/api"
        status: pass
    human_judgment: false
  - id: D2
    description: "Authenticated change-password requires the current password, rejects the old credential after change and accepts the new credential."
    requirement: IDT-09
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-sessions.test.ts#changes password only for authenticated users with the current password"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "requireAuth resolves bearer access tokens to tenant, user and session context only when JWT claims match an active unrevoked session and active user."
    requirement: IDT-10
    verification:
      - kind: integration
        ref: "apps/api/src/test/auth-sessions.test.ts#returns sanitized current-user data only for an active bearer session"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
    human_judgment: false
  - id: D4
    description: "Bootstrap, login, refresh, logout, reset request, reset completion and password change create audit records without persisted submitted passwords, tokens, reset codes or hashes."
    requirement: IDT-13
    verification:
      - kind: integration
        ref: "apps/api/src/test/audit.test.ts#records auth lifecycle events without storing submitted secrets"
        status: pass
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-19
status: complete
---

# Phase 02 Plan 04: Password Recovery, Auth Audit and requireAuth Summary

**Password reset and change-password routes with auth-scoped email delivery, reusable backend auth context and sanitized audit records.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-19T12:04:48Z
- **Completed:** 2026-07-19T12:13:42Z
- **Tasks:** 2 completed
- **Files modified:** 13

## Accomplishments

- Added RED coverage for password reset by registered email code, authenticated change-password and auth lifecycle audit redaction.
- Implemented reset-code request/completion with hashed single-use codes, short TTL and fake EmailSender injection for tests.
- Added an env-gated SMTP EmailSender adapter for authentication recovery only, documented in `.env.example`.
- Added reusable `requireAuth` middleware/context resolution that validates bearer JWT claims against active unrevoked sessions and active users.
- Centralized audit writes through `writeAuditLog`, sanitizing metadata before persistence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED reset, change-password and audit assertions** - `80e3f0a` (test)
2. **Task 2: Implement recovery email, audit and requireAuth** - `7ad774f` (feat)
3. **Verification cleanup: Format audit recovery changes** - `0b75277` (style)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `apps/api/src/audit/auditService.ts` - Sanitized append-only audit writer for auth metadata.
- `apps/api/src/auth/passwordReset.ts` - Password reset request and completion service with hashed single-use codes.
- `apps/api/src/http/middleware/requireAuth.ts` - Bearer JWT/session-backed auth context middleware and resolver.
- `apps/api/src/mail/emailSender.ts` - Fake/noop-compatible EmailSender interface plus SMTP adapter for auth recovery only.
- `apps/api/src/types/nodemailer.d.ts` - Narrow local declaration for the Nodemailer surface used by the adapter.
- `apps/api/src/http/routes/auth.ts` - Adds reset request/complete, change-password and shared audit/context usage.
- `apps/api/src/http/routes/bootstrap.ts` - Routes bootstrap audit through the sanitized audit service.
- `apps/api/src/app.ts` - Injects EmailSender into auth routes.
- `apps/api/src/config/env.ts` - Adds password-reset TTL and optional SMTP config.
- `.env.example` - Documents optional SMTP variables and reset TTL.
- `apps/api/src/test/auth-sessions.test.ts` - Adds reset and change-password integration coverage.
- `apps/api/src/test/audit.test.ts` - Adds auth lifecycle audit redaction coverage.
- `apps/api/src/test/testData.ts` - Adds fake EmailSender and audit row helpers.

## Verification

| Check | Result |
|-------|--------|
| RED: `npm run test -w apps/api -- auth-sessions audit` before implementation | Expected fail - reset/change-password routes returned 404 and audit reset event was absent |
| `npm run test -w apps/api -- auth-sessions audit && npm run typecheck -w apps/api` | Pass - 7 targeted auth/audit tests passed and API typecheck passed |
| `npm run test -w apps/api -- auth-sessions audit auth-bootstrap && npm run typecheck -w apps/api` | Pass - 9 auth/bootstrap/audit tests passed and API typecheck passed |
| `npm run verify` | Pass - format, lint, typecheck and workspace tests passed; API suite 16 tests, web suite 5 tests |

## Decisions Made

- Kept SMTP optional and env-gated. Automated tests use injected fake senders and local/dev without SMTP uses the no-op sender; no real SMTP credentials are required for verification.
- Kept password reset responses generic: request returns `202` regardless of whether the email exists, and completion uses generic `401` failures for invalid/reused codes.
- Used a local Nodemailer declaration file instead of adding `@types/nodemailer`, because adding an unplanned package during execution would create a package-legitimacy decision outside this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Narrowed audit secret assertions to payload metadata for semantic action names**
- **Found during:** Task 2
- **Issue:** The RED audit test rejected the substring `password` anywhere in the full audit row, which also rejected legitimate action names such as `auth.password_reset.completed`.
- **Fix:** Kept literal submitted-secret checks across the full persisted row, and narrowed secret-shaped key checks to audit payload metadata where leaked request fields would appear.
- **Files modified:** `apps/api/src/test/audit.test.ts`
- **Verification:** `npm run test -w apps/api -- auth-sessions audit && npm run typecheck -w apps/api` passed.
- **Committed in:** `7ad774f`

**2. [Rule 2 - Missing Critical] Routed bootstrap audit through the sanitized audit service**
- **Found during:** Task 2
- **Issue:** Existing bootstrap audit from 02-03 wrote directly to Prisma, bypassing the new central audit sanitizer while the plan requires bootstrap audit redaction coverage.
- **Fix:** Updated bootstrap to call `writeAuditLog` with sanitized metadata.
- **Files modified:** `apps/api/src/http/routes/bootstrap.ts`
- **Verification:** `npm run test -w apps/api -- auth-sessions audit auth-bootstrap && npm run typecheck -w apps/api` passed.
- **Committed in:** `7ad774f`

**3. [Rule 3 - Blocking] Added a local Nodemailer declaration for typecheck**
- **Found during:** Task 2
- **Issue:** `nodemailer` was installed from 02-01, but no TypeScript declaration was available, causing API typecheck to fail.
- **Fix:** Added a narrow local `nodemailer` module declaration for the adapter surface used by this plan instead of installing a new package.
- **Files modified:** `apps/api/src/types/nodemailer.d.ts`
- **Verification:** `npm run typecheck -w apps/api` and `npm run verify` passed.
- **Committed in:** `7ad774f`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical functionality, 1 blocking type issue).
**Impact on plan:** All fixes stayed inside password recovery, audit and auth middleware scope; no customer communication or notification capability was added.

## Issues Encountered

- Broader verification initially failed Prettier formatting in `auditService.ts` and `testData.ts`; running the local Prettier binary fixed it.
- Lint then found one unused audit test import; removing it allowed the final `npm run verify` to pass.

## User Setup Required

None for automated verification. Real password recovery email delivery requires optional SMTP variables documented in `.env.example`.

## Known Stubs

None.

## Threat Flags

None - the public reset API, API-to-SMTP recovery boundary and protected bearer-auth boundary are covered by the plan threat model.

## Next Phase Readiness

Ready for `02-05-PLAN.md`: password recovery, authenticated password change, sanitized auth audit and reusable backend auth context are in place for permission-sensitive administration.

## Self-Check: PASSED

- Found summary file at `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-04-SUMMARY.md`.
- Found task commits `80e3f0a`, `7ad774f` and `0b75277` in git history.
- Confirmed targeted auth/audit validation and full `npm run verify` passed.

---
*Phase: 02-autentica-o-tenant-e-permiss-es*
*Completed: 2026-07-19*
