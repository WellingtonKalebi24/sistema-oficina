# Phase 2: Autenticacao, Tenant e Permissoes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-18
**Phase:** 2-Autenticacao, Tenant e Permissoes
**Areas discussed:** Entrada e primeiro admin, Sessoes e dispositivos, Papeis e permissoes, Recuperacao de senha

---

## Entrada e primeiro admin

| Option | Description | Selected |
|--------|-------------|----------|
| Bootstrap route then lock | Allow an initial route/flow to create the first admin, then protect user creation by permission. | yes |
| Manual seed only | First admin exists only through seed/manual database setup. | |
| Always-open creation route | Keep user creation publicly reachable. | |

**User's choice:** Bootstrap route then lock.
**Notes:** User explicitly allowed enabling a user-creation route first, then blocking it so only a user with permission to create admin users can create another user with that permission. The admin UI needs a user creation menu.

---

## Papeis e permissoes

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed roles only | Use predefined roles and defer configurable permissions. | |
| Configurable permissions | Roles and permissions are configurable in Phase 2. | yes |
| Configurable permissions plus overrides | Configurable permissions with user-specific overrides. | yes |

**User's choice:** Configurable permissions.
**Notes:** User selected permissions already configurable. Requirement IDT-04 still requires user-specific permission overrides, so downstream planning should include overrides.

---

## Recuperacao de senha

| Option | Description | Selected |
|--------|-------------|----------|
| Email code | Send a reset code to the user's registered email and use it to reset the password. | yes |
| Admin reset only | Admin resets or issues temporary password manually. | |
| No recovery in MVP | Defer password recovery. | |

**User's choice:** Email code.
**Notes:** User said the system already knows the email and should send the code there so the user can reset the password. This email behavior is only for authentication recovery and does not change the product prohibition on customer communications and notifications.

---

## Sessoes e dispositivos

| Option | Description | Selected |
|--------|-------------|----------|
| Multissessao | User may stay logged in on more than one device; logout invalidates only the current session. | yes |
| Sessao unica | A new login invalidates the previous session. | |
| Admin gerencia sessoes | Multiple sessions plus admin UI to revoke user sessions. | |

**User's choice:** Multissessao.
**Notes:** User selected option 1. Refresh token and logout behavior should be session-scoped.

---

## The Agent's Discretion

- Exact hashing algorithm, reset-code format, token storage, refresh token rotation, email-provider abstraction and permission naming are left to planning/research as long as they respect the captured decisions.

## Deferred Ideas

None.
