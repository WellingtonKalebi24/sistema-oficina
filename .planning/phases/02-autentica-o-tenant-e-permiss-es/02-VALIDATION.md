---
phase: 02
slug: autentica-o-tenant-e-permiss-es
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-18
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 |
| **Config file** | `apps/web/vite.config.ts`; API tests use the workspace Vitest setup established in Phase 1 |
| **Quick run command** | `npm run test -w apps/api -- auth` or the targeted auth/tenant test file once created |
| **Full suite command** | `npm run verify` |
| **Estimated runtime** | ~120 seconds with local PostgreSQL available |

---

## Sampling Rate

- **After every task commit:** Run targeted tests for touched auth/admin files plus `npm run typecheck --workspaces --if-present`.
- **After every plan wave:** Run `npm run verify`.
- **Before `$gsd-verify-work`:** Run `npm run verify`, `npm run db:migrate`, and Docker Compose smoke when Docker Desktop is available.
- **Max feedback latency:** 120 seconds for targeted checks; full suite latency may exceed this when Docker rebuilds are required.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-00-01 | 00 | 0 | IDT-01 | T-BOOTSTRAP | Bootstrap creates tenant/settings/admin and locks after first run. | API integration | `npm run test -w apps/api -- auth-bootstrap` | no - W0 | pending |
| 02-00-02 | 00 | 0 | IDT-02 | T-TENANT-USERS | Tenant admin can list/create/edit/deactivate users only in tenant. | API integration | `npm run test -w apps/api -- users` | no - W0 | pending |
| 02-00-03 | 00 | 0 | IDT-03 | T-PERMISSIONS | Admin can create roles and assign permissions. | API integration | `npm run test -w apps/api -- permissions` | no - W0 | pending |
| 02-00-04 | 00 | 0 | IDT-04 | T-OVERRIDES | User-specific allow/deny overrides change effective permissions. | unit + API integration | `npm run test -w apps/api -- permissions` | no - W0 | pending |
| 02-00-05 | 00 | 0 | IDT-05 | T-AUTHN | Login verifies Argon2id password and rejects invalid credentials generically. | API integration | `npm run test -w apps/api -- auth-login` | no - W0 | pending |
| 02-00-06 | 00 | 0 | IDT-06 | T-SESSION | Refresh validates and rotates only the active session. | API integration | `npm run test -w apps/api -- sessions` | no - W0 | pending |
| 02-00-07 | 00 | 0 | IDT-07 | T-LOGOUT | Logout revokes only the current session in a multi-session model. | API integration | `npm run test -w apps/api -- sessions` | no - W0 | pending |
| 02-00-08 | 00 | 0 | IDT-08 | T-RESET | Password reset request and completion use registered email and a single-use code. | API integration | `npm run test -w apps/api -- password-reset` | no - W0 | pending |
| 02-00-09 | 00 | 0 | IDT-09 | T-PASSWORD | Authenticated user can change password and old password no longer works. | API integration | `npm run test -w apps/api -- password-change` | no - W0 | pending |
| 02-00-10 | 00 | 0 | IDT-10 | T-AUTHZ | Missing or invalid authentication blocks protected API routes. | API integration | `npm run test -w apps/api -- auth-guards` | no - W0 | pending |
| 02-00-11 | 00 | 0 | IDT-11 | T-PERMISSION-GUARD | Missing permission blocks protected actions in the backend. | API integration | `npm run test -w apps/api -- auth-guards` | no - W0 | pending |
| 02-00-12 | 00 | 0 | IDT-12 | T-TENANT-ISOLATION | Tenant A cannot read or mutate Tenant B records. | API integration | `npm run test -w apps/api -- tenant-isolation` | no - W0 | pending |
| 02-00-13 | 00 | 0 | IDT-13 | T-AUDIT | Auth, permission and sensitive user-management events create sanitized audit rows. | API integration | `npm run test -w apps/api -- audit` | no - W0 | pending |
| 02-00-14 | 00 | 0 | IDT-01..IDT-13 | T-UI-AUTH | Login/admin menus expose allowed workflows without replacing backend enforcement. | web component | `npm run test -w apps/web -- auth-ui` | no - W0 | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/test/auth-bootstrap.test.ts` - covers IDT-01.
- [ ] `apps/api/src/test/auth-sessions.test.ts` - covers IDT-05, IDT-06, IDT-07, IDT-09, IDT-10.
- [ ] `apps/api/src/test/permissions.test.ts` - covers IDT-03, IDT-04, IDT-11.
- [ ] `apps/api/src/test/tenant-isolation.test.ts` - covers IDT-02, IDT-12.
- [ ] `apps/api/src/test/audit.test.ts` - covers IDT-13 and secret redaction.
- [ ] `apps/web/src/test/auth-ui.test.tsx` - covers login/admin menu UX without asserting backend authorization.
- [ ] Test data helpers for creating tenants, users, sessions and permissions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real SMTP delivery | IDT-08 | No SMTP provider or credentials are configured in the repository. | Automated tests must use a fake sender; manual SMTP setup belongs to environment-specific validation once credentials exist. |
| Docker Compose smoke | IDT-01..IDT-13 | Docker daemon availability is machine-dependent. | When Docker Desktop is running, execute the documented Compose stack and API/web smoke checks. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 120s for targeted checks.
- [ ] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
