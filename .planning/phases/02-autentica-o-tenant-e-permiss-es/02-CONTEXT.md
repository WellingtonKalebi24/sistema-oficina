# Phase 2: Autenticacao, Tenant e Permissoes - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers secure identity, tenant setup, user administration, configurable roles and permissions, authenticated sessions, password recovery, backend route protection, tenant isolation tests and audit events for authentication and permission-sensitive operations.

It introduces the administrative identity surface needed by the rest of the MVP: an administrator can configure the workshop, manage users, configure permissions and safely control who can perform protected actions. It does not implement customers, vehicles, stock, scheduling, quotes, work orders, finance, portal, reports or automatic customer communication.

</domain>

<decisions>
## Implementation Decisions

### Bootstrap And User Creation
- **D-01:** The system may expose an initial bootstrap route or flow to create the first tenant/admin user.
- **D-02:** After bootstrap is complete, user creation must be protected by backend authorization. UI hiding is not sufficient.
- **D-03:** Only a user with the permission to create admin users may create another user with admin-level permission.
- **D-04:** The admin interface must include a user creation/management menu for authorized administrators.

### Roles And Permissions
- **D-05:** Permissions must be configurable in Phase 2, not only hardcoded roles.
- **D-06:** The permission model must support user-specific permission overrides, matching requirement IDT-04.
- **D-07:** Backend permission checks are authoritative for every protected action introduced in this phase.

### Sessions
- **D-08:** Use multi-session behavior: a user may stay logged in on more than one device/session.
- **D-09:** Logout invalidates the active session without invalidating every other session for that user.
- **D-10:** Refresh token handling must still support secure invalidation and auditability for each session.

### Password Recovery
- **D-11:** Password recovery sends a reset code to the user's already-registered email address.
- **D-12:** The user completes password reset by providing the code and the new password.
- **D-13:** Reset codes and reset completion must be audited without storing secrets in audit logs.
- **D-14:** Email delivery is allowed for this authentication recovery flow. This decision does not authorize marketing, notification center behavior, WhatsApp, SMS, push, or automatic customer communication features.

### UI Surface
- **D-15:** The Phase 2 UI should add login, authenticated shell, tenant/company settings, user management and permission configuration surfaces following `docs/VISUAL_CONTRACT.md`.
- **D-16:** Admin menus and blocked states should be visible only where appropriate, but all enforcement must remain in the API.

### The Agent's Discretion
- The planner may choose exact password hashing, reset-code format, token storage, refresh token rotation, email provider abstraction and permission naming if the choices fit the stack, security constraints and the user decisions above.
- The planner should keep bootstrap controlled and development-friendly while preventing an open public route after the first admin exists.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope And Requirements
- `PROJETO.md` - Original product specification, stack, MVP boundaries and communication constraints.
- `.planning/PROJECT.md` - Consolidated project context, core value, constraints and cross-cutting requirements.
- `.planning/REQUIREMENTS.md` - Phase 2 requirements IDT-01 through IDT-13.
- `.planning/ROADMAP.md` - Phase 2 goal, scope, risks and success criteria.
- `.planning/STATE.md` - Current project state and Phase 1 completion notes.

### Research And Cross-Cutting Constraints
- `.planning/research/STACK.md` - Selected stack and implementation notes.
- `.planning/research/ARCHITECTURE.md` - Tenant isolation, backend authorization, transactions and audit guidance.
- `.planning/research/FEATURES.md` - Feature categories and explicit prohibitions.
- `.planning/research/PITFALLS.md` - Security, integrity, scope and production risks.
- `.planning/research/SUMMARY.md` - High-level research summary and watch-outs.

### Prior Phase Context
- `.planning/phases/01-funda-o-t-cnica-e-contrato-visual/01-CONTEXT.md` - Foundation and visual decisions carried into this phase.
- `.planning/phases/01-funda-o-t-cnica-e-contrato-visual/01-03-SUMMARY.md` - Current executable skeleton, Docker stack, verification and established UI patterns.
- `docs/VISUAL_CONTRACT.md` - Canonical UI contract for operational screens and states.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/app.ts` - Express app setup already includes Helmet, CORS, JSON body limit, pino HTTP logging, health routes and global error handling integration.
- `apps/api/src/http/errors.ts` - Existing `HttpError`, `badRequest`, `asyncHandler` and error handler can be extended for auth/permission errors without leaking secrets.
- `apps/api/src/db/prisma.ts` - Prisma client integration point for new identity, tenant, permission, session and audit models.
- `apps/web/src/design/formatters.ts` - Existing Brazilian date/time and currency helpers for authenticated UI.
- `apps/web/src/App.tsx` and `apps/web/src/styles.css` - First compact operational UI pattern and state handling baseline.

### Established Patterns
- Root `npm run verify` is the phase gate for formatting, lint, type check and tests.
- API routes are created as isolated routers and mounted from `createApp`.
- Web API calls live under `apps/web/src/api`.
- The UI uses compact panels, table-first operational views, visible labels, explicit status states and no marketing layout.
- Docker Compose runs PostgreSQL, API and web together; Phase 2 should keep local verification through this stack.

### Integration Points
- Prisma schema is currently neutral with only `FoundationCheck`; Phase 2 can introduce identity and tenant models without migrating existing business data.
- API authentication middleware should mount before protected routers while keeping public health and bootstrap/reset routes controlled.
- Frontend should replace or evolve the neutral foundation screen into an authenticated operator shell without introducing later business modules.
- Tests must prove backend authorization, token invalidation and tenant isolation from the beginning of this phase.

</code_context>

<specifics>
## Specific Ideas

- Bootstrap should be possible through a route/flow for the first admin, then locked down after initial creation.
- Admin users need a user-creation menu.
- Permission configuration is part of the MVP phase, not postponed.
- Password reset uses an email code sent to the email already known for the user.
- Sessions are multi-session; logout applies to the current session.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Autenticacao, Tenant e Permissoes*
*Context gathered: 2026-07-18*
