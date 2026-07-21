---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: Phase 3 - Clientes e Veículos
status: executing
stopped_at: Completed 03-02-PLAN.md
last_updated: "2026-07-21T00:41:32.274Z"
progress:
  total_phases: 12
  completed_phases: 2
  total_plans: 12
  completed_plans: 11
  percent: 92
---

# Project State: JO.IA

**Last updated:** 2026-07-21
**Status:** Ready to execute
**Current phase:** Phase 3 - Clientes e Veículos

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-14)

**Core value:** Uma oficina consegue executar e auditar todo o ciclo de atendimento de um veículo, da entrada ao pagamento, com isolamento seguro por tenant e sem depender de comunicações automáticas com o cliente.
**Current focus:** Executar clientes e veículos com isolamento seguro por tenant, contratos RED e fundação de dados auditável.

## Completed

- GSD project initialized from `PROJETO.md`.
- Planning config created in `.planning/config.json`.
- Project context created in `.planning/PROJECT.md`.
- Research artifacts created in `.planning/research/`.
- Requirements created in `.planning/REQUIREMENTS.md`.
- Roadmap created in `.planning/ROADMAP.md`.
- Phase 1 plan 01-01 completed: npm workspace scaffold, strict tooling and RED walking-skeleton contract.
- Phase 1 plan 01-02 completed: Prisma/PostgreSQL foundation, Express API health/write-read route and Docker Compose db/api runtime.
- Phase 1 plan 01-03 completed: React/Vite web walking skeleton, Docker web service, local setup docs, visual contract and skeleton record.
- Phase 2 plan 02-01 completed: approved auth/admin dependency installation after SUS package legitimacy checkpoint.
- Phase 2 plan 02-02 completed: identity, tenant, permission, session, reset-token and audit Prisma schema with RED auth route contracts.
- Phase 2 plan 02-03 completed: password/token/session services, first-admin bootstrap, login, refresh rotation, current-session logout and current-user API.
- Phase 3 plan 03-01 completed: customer/vehicle schema, permission keys, tenant helpers and RED backend contracts.
- Phase 3 plan 03-02 completed: protected tenant-scoped customer/vehicle API routes, services, audit, history and isolation.

## Current Decisions

- Use GSD, not BMAD.
- Treat the repository as greenfield.
- Use vertical MVP phases.
- Use React, Vite, TypeScript, Node.js, Express, PostgreSQL, Prisma and Docker Compose unless a recorded decision changes this.
- Keep planning docs in git.
- Do not implement automatic customer communications, notification center or notification entities.

## Pending Decisions For Phase 1

- Monorepo layout and package manager.
- Exact test runner choices for frontend and backend.
- Formatting/linting tools and scripts.
- Initial visual palette, typography and UI primitives for JO.IA.
- Docker Compose service names and environment variable naming.

## Open Risks

- Scope is large; phases must stay verifiable and avoid expanding beyond their stated success criteria.
- Tenant isolation is a cross-cutting risk from Phase 2 onward.
- Quote versioning and approval immutability are high-risk business rules.
- Stock and finance require careful transaction design.
- Notification features must not creep back through dashboard, portal or maintenance reminders.

## Next Step

Start Phase 3 plan 03-03 for authenticated customer/vehicle UI, setup notes and final Phase 3 verification.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260720-f2r | Mover recuperacao de acesso para link abaixo do login | 2026-07-20 | df375cb | [260720-f2r-mover-recuperacao-de-acesso-para-link-ab](./quick/260720-f2r-mover-recuperacao-de-acesso-para-link-ab/) |
| 260720-taw | Criar pagina esqueceu senha e aplicar componentes shadcn ui no acesso | 2026-07-21 | 0737a54 | [260720-taw-criar-pagina-esqueceu-senha-e-aplicar-co](./quick/260720-taw-criar-pagina-esqueceu-senha-e-aplicar-co/) |

## Tests Executed

- 02-02: `npm run db:migrate` passed.
- 02-02: `npm run test -w apps/api -- prisma-baseline` passed.
- 02-02: `npm run test -w apps/api -- prisma-baseline auth-bootstrap auth-sessions` is expected RED for 02-03 auth routes, with schema baseline passing and route tests returning 404.
- 02-03: `npm run db:migrate` passed.
- 02-03: `npm run test -w apps/api -- auth-bootstrap auth-sessions` passed with 6 auth tests.
- 02-03: `npm run verify` passed.
- 02-04: `npm run test -w apps/api -- auth-sessions audit && npm run typecheck -w apps/api` passed.
- 02-04: `npm run verify` passed.
- quick 260720-f2r: `npm run test -w apps/web -- auth-ui`, `npm run typecheck -w apps/web`, `npm run lint -w apps/web` and targeted `format:check` passed.
- quick 260720-taw: `npm run test -w apps/web -- auth-ui`, `npm run typecheck -w apps/web`, `npm run lint -w apps/web`, targeted `format:check` and login smoke with `wellingtonrdp16@gmail.com` passed.
- 03-01: `npm run db:migrate` passed and applied `20260720000000_add_customers_vehicles`, then later reported already in sync.
- 03-01: `npm run test -w apps/api -- prisma-baseline customer-vehicles` is expected RED for 03-02 customer/vehicle routes; `prisma-baseline` passed and five customer/vehicle tests failed on 404.
- 03-01: `npm run typecheck -w apps/api`, `npm run lint -w apps/api` and `npm run format:check` passed.

## Known Issues

- Customer/vehicle API route and service behavior is intentionally RED for 03-02: `/customers` and `/vehicles` currently return 404.

## Session

**Last session:** 2026-07-21T00:41:31.748Z
**Stopped at:** Completed 03-02-PLAN.md
**Resume file:** None

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 01 P01 | 12min | 2 tasks | 19 files |
| Phase 01 P02 | multi-session | 3 tasks | Prisma, API, Docker Compose |
| Phase 01 P03 | same-session | 3 tasks | Web UI, Docker web, docs, visual contract |
| Phase 02 P01 | 14min | 2 tasks | 4 files |
| Phase 02 P02 | 35min | 2 tasks | 10 files |
| Phase 02 P03 | 12min | 2 tasks | 12 files |
| Phase 02 P04 | 9min | 2 tasks | 13 files |
| Phase 02 P05 | 12min | 2 tasks | 16 files |
| Phase 02 P06 | 14min | 3 tasks | 9 files |
| Phase 03 P01 | 8min | 2 tasks | 8 files |
| Phase 03 P02 | 10min | 2 tasks | 6 files |

## Decisions

- [Phase 01]: Plan 01 package gate resolved with audited package names only; no similarly named substitutions were installed.
- [Phase 01]: TypeScript pinned to 6.0.3 for compatibility with typescript-eslint 8.64.0.
- [Phase 01]: Prisma 7.8.0 retained for stack continuity; moderate npm audit advisory documented for follow-up instead of downgrading to Prisma 6.19.3.
- [Phase 01]: Plan 02 kept the schema neutral with only FoundationCheck; no business, auth, tenant or communication entities were introduced.
- [Phase 01]: Docker Desktop storage for this machine was moved to E:\DockerDesktop\wsl\disk via junction to keep builds off the nearly full C: drive.
- [Phase 01]: Plan 03 completed the full walking skeleton and established docs/VISUAL_CONTRACT.md as the UI contract for later operational screens.
- [Phase 02]: Plan 01 installed only exact approved auth/admin package names after the SUS package checkpoint: nodemailer, express-rate-limit and react-router.
- [Phase 02]: Nodemailer remains scoped to authentication password recovery only; no customer communication or notification capability was introduced.
- [Phase 02]: Modeled Phase 2 identity data in one Prisma migration so later auth/admin plans can implement routes and services without schema churn. — Keeps later Phase 2 plans focused on auth/admin service behavior instead of repeated schema churn.
- [Phase 02]: Seeded only stable permission keys and default role metadata; no tenant-specific roles or business entities are created by the seed. — Preserves deterministic seed behavior while avoiding out-of-scope tenant/business data.
- [Phase 02]: Configured API Vitest file execution serially because integration tests share one PostgreSQL schema and perform table cleanup. — Prevents false failures from concurrent cleanup in shared-database integration tests.
- [Phase 02]: Implemented refresh sessions as opaque browser-managed tokens submitted in JSON, not cookies, matching the resolved research contract.
- [Phase 02]: Kept /auth/bootstrap compatibility with the previous RED test contract while also exposing /bootstrap/status and /bootstrap/create-first-admin.
- [Phase 02]: Root verification now delegates to workspace test scripts so API PostgreSQL integration tests preserve their serial Vitest config.
- [Phase 02]: Kept EmailSender narrowly scoped to authentication password recovery; no customer notification, communication module, queue or delivery/read tracking was introduced. — Preserves the project communication prohibition while allowing the locked auth recovery exception.
- [Phase 02]: Centralized auth audit redaction in writeAuditLog by dropping metadata keys shaped like passwords, tokens, reset codes, hashes or secrets before persistence. — Makes D-13 audit secrecy enforceable from auth routes and future protected routes.
- [Phase 02]: Added a local narrow Nodemailer declaration instead of installing another package during execution, avoiding an unplanned package-legitimacy gate. — Typecheck needed declarations, but adding an unplanned package would exceed 02-04 scope.
- [Phase 02]: Plan 05 centralized permission keys in apps/api/src/permissions/permissions.ts for seed, bootstrap, auth serialization and admin route validation. — Prevents permission key drift across backend enforcement and fixtures.
- [Phase 02]: Plan 05 mounted protected admin APIs after existing public health/bootstrap/auth/foundation/test routes. — Preserves existing diagnostics while enforcing backend authorization on admin routes.
- [Phase 02]: Plan 05 requires users.createAdmin for admin-level role permission grants and allow overrides. — Implements D-03 and prevents privilege escalation by users who can create only regular users.
- [Phase 02]: Used react-router for the authenticated web shell while keeping backend authorization authoritative and displaying API 403 as a server-permission blocked state.
- [Phase 02]: Browser session storage is limited to access token, opaque refresh token, session id, tenant id, user profile and effective permissions.
- [Phase 03]: Plan 01 uses PostgreSQL partial unique indexes for active-only customer document, vehicle plate and vehicle VIN uniqueness; Prisma @@unique is not used for soft-delete predicates.
- [Phase 03]: Plan 01 keeps customer phone duplicate behavior non-unique while indexing phone_normalized for search.
- [Phase 03]: Plan 01 leaves /customers and /vehicles API behavior RED for 03-02 and does not mark CAV requirements complete from the foundation-only plan.
- [Phase 03]: Plan 02 kept phone duplicates allowed while enforcing active customer document, vehicle plate and vehicle VIN duplicate checks in backend services and database constraints.
- [Phase 03]: Plan 02 accepts 14-position alphanumeric CNPJ through backend normalization and light validation.
- [Phase 03]: Plan 02 uses Vehicle.customerId as the current customer link and records vehicle.linked history events for current-link creation or changes.
- [Phase 03]: Plan 02 keeps customer/vehicle audit metadata concise with changed fields and related IDs, not raw notes, full phone/document values or VIN bodies.
