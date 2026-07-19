---
phase: 02-autentica-o-tenant-e-permiss-es
plan: 01
subsystem: auth
tags: [npm, auth, jwt, argon2, zod, nodemailer, rate-limit, react-router]

requires:
  - phase: 01-funda-o-t-cnica-e-contrato-visual
    provides: npm workspace scaffold, strict TypeScript tooling, API and web package boundaries
provides:
  - Approved Phase 2 authentication and admin-routing dependency surface
  - Recorded human package legitimacy approval for nodemailer, express-rate-limit and react-router
affects: [phase-02-auth, api-auth, web-admin-routing, package-management]

tech-stack:
  added: [argon2, jose, zod, nodemailer, express-rate-limit, react-router]
  patterns:
    - Exact-name package installation after package legitimacy checkpoint
    - Workspace-scoped dependency additions for API and web packages

key-files:
  created:
    - .planning/phases/02-autentica-o-tenant-e-permiss-es/02-01-SUMMARY.md
  modified:
    - apps/api/package.json
    - apps/web/package.json
    - package-lock.json

key-decisions:
  - "Installed only the exact approved package names from the Phase 2 package gate: nodemailer, express-rate-limit and react-router."
  - "Kept nodemailer scoped to future authentication password recovery only; no customer communication or notification capability was introduced."

patterns-established:
  - "SUS package gate: human approval is recorded before installing package names flagged by the research audit."

requirements-completed:
  - IDT-05
  - IDT-06
  - IDT-08

coverage:
  - id: D1
    description: "API dependency surface includes approved libraries for Argon2id password verification, jose JWTs, Zod validation, SMTP recovery mail and auth rate limiting."
    requirement: IDT-05
    verification:
      - kind: other
        ref: "npm ls -w apps/api argon2 jose zod nodemailer express-rate-limit"
        status: pass
      - kind: other
        ref: "npm run typecheck --workspaces --if-present"
        status: pass
    human_judgment: false
  - id: D2
    description: "Web dependency surface includes React Router for authenticated admin route surfaces."
    verification:
      - kind: other
        ref: "npm ls -w apps/web react-router"
        status: pass
      - kind: other
        ref: "npm run typecheck --workspaces --if-present"
        status: pass
    human_judgment: false
  - id: D3
    description: "Human package legitimacy checkpoint approval was recorded for nodemailer, express-rate-limit and react-router before installation."
    verification:
      - kind: manual_procedural
        ref: "User checkpoint response: approved for exact packages nodemailer, express-rate-limit and react-router"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-07-19
status: complete
---

# Phase 02 Plan 01: Package Legitimacy and Dependency Surface Summary

**Approved authentication and admin-routing dependencies are installed in the correct npm workspaces with the SUS package gate recorded.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-19T08:19:00-03:00
- **Completed:** 2026-07-19T08:33:17-03:00
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Recorded the user's explicit approval for the exact SUS package names `nodemailer`, `express-rate-limit` and `react-router` before installing them.
- Installed API dependencies for secure password hashing, JWT access tokens, runtime validation, password-recovery SMTP delivery and auth endpoint rate limiting.
- Installed the web routing dependency needed for authenticated admin route surfaces in later Phase 2 plans.
- Verified both workspace dependency trees and the full workspace typecheck.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Verify SUS package legitimacy before install** - checkpoint satisfied by user response `approved`; no code commit because no files changed.
2. **Task 2: Install approved Phase 2 dependencies** - `fcec266` (chore)

**Plan metadata:** committed after this summary was written.

## Files Created/Modified

- `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-01-SUMMARY.md` - Plan execution summary and checkpoint approval record.
- `apps/api/package.json` - Added `argon2`, `jose`, `zod`, `nodemailer` and `express-rate-limit`.
- `apps/web/package.json` - Added `react-router`.
- `package-lock.json` - Resolved the approved packages and their transitive dependency tree.

## Verification

| Check | Result |
|-------|--------|
| `npm install -w apps/api argon2 jose zod nodemailer express-rate-limit` | Pass |
| `npm install -w apps/web react-router` | Pass |
| `npm ls -w apps/api argon2 jose zod nodemailer express-rate-limit` | Pass - found `argon2@0.45.0`, `jose@6.2.3`, `zod@4.4.3`, `nodemailer@9.0.3`, `express-rate-limit@8.6.0` |
| `npm ls -w apps/web react-router` | Pass - found `react-router@7.18.1` |
| `npm run typecheck --workspaces --if-present` | Pass |

## Decisions Made

- Installed only exact approved package names; no similarly named packages were installed.
- Accepted npm's current registry resolution for package versions while preserving the exact audited package names from the plan.
- Kept `nodemailer` as future auth recovery infrastructure only, consistent with D-14 and the project prohibition on customer communication automation.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope change.

## Authentication Gates

None.

## Human Checkpoints

- **Task 1 package legitimacy checkpoint:** The user responded `approved` for the exact packages `nodemailer`, `express-rate-limit` and `react-router`. Installation proceeded only after that approval.

## Known Stubs

None.

## Threat Flags

None - the only trust-boundary change was npm package installation, already covered by the plan threat model.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration was added in this dependency-only plan.

## Next Phase Readiness

Ready for `02-02-PLAN.md`: schema, tenant, identity, permission, session and audit implementation can import the approved dependencies.

## Self-Check: PASSED

- Found summary file at `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-01-SUMMARY.md`.
- Found task commit `fcec266` in git history.
- Re-ran package-tree checks for API and web workspaces successfully.

---
*Phase: 02-autentica-o-tenant-e-permiss-es*
*Completed: 2026-07-19*
