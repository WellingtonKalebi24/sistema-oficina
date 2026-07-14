# Walking Skeleton — JO.IA

**Phase:** 1
**Generated:** 2026-07-14

## Capability Proven End-to-End

An operator can open the local JO.IA web app, submit a neutral foundation check, and see the persisted result returned through the API from PostgreSQL.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Package manager | npm workspaces | Locked by D-02 to avoid adding package-manager risk before the app exists. |
| Directory layout | `apps/web`, `apps/api`, `packages/shared`, `prisma`, `docs` | Locked by D-01 and keeps frontend, backend, shared types, persistence and documentation boundaries explicit. |
| Frontend framework | React + Vite + TypeScript | Matches the project stack and supports a focused operational SaaS UI surface. |
| Backend framework | Node.js + Express + TypeScript | Matches the project stack and allows an explicit API app factory, route modules, error middleware and structured logging. |
| Data layer | PostgreSQL + Prisma migrations | Matches the project stack; Prisma owns schema history per D-09. |
| Diagnostic model | `FoundationCheck` only | Proves one real database write/read without starting auth, tenants, customers, stock, quotes, work orders, finance, dashboard, portal, reports or notifications. |
| Auth | Not implemented in Phase 1 | Phase 2 owns authentication, tenant isolation, roles and permissions. |
| Local runtime | Docker Compose with `db`, `api` and `web` services | Proves local full-stack execution per FND-01 and D-08. |
| Visual contract | `docs/VISUAL_CONTRACT.md` plus first CSS tokens | Establishes the JO.IA operational SaaS contract before major screens per D-12 through D-14. |

## Stack Touched in Phase 1

- [ ] Project scaffold: npm workspaces, build scripts, lint, format check, type check and tests.
- [ ] Routing: one real web route and API routes for health and neutral foundation checks.
- [ ] Database: one real PostgreSQL read and one real PostgreSQL write through Prisma.
- [ ] UI: one interactive form wired to the API.
- [ ] Local runtime: Docker Compose command documented in `docs/LOCAL_SETUP.md`.

## Out of Scope for Phase 1

- Authentication, sessions, refresh tokens, password flows, users, roles and permissions.
- Tenant and company settings.
- Customers, vehicles, agenda, reception, diagnostics, quotes, approvals, work orders and production.
- Services, products, suppliers, stock, purchases and reservations.
- Finance, cash, accounts payable, accounts receivable, reports, dashboard, portal and audit administration.
- Notification center, message counters, message queues, WhatsApp or email integrations, automatic communication, send buttons, delivery tracking and read tracking.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without renegotiating the decisions above:

- Phase 2: secure access, tenant, company settings, users, roles and permissions.
- Phase 3: tenant-safe customers and vehicles.
- Phase 4: services, products, suppliers, purchases and transactional stock.
- Phase 5: agenda and vehicle reception.
- Phase 6: diagnosis and versioned quote with manual link copy.
- Phase 7: public quote approval by secure token.
- Phase 8: work order conversion and execution control.
- Phase 9: production tasks and board.
- Phase 10: finance and cash controls.
- Phase 11: dashboard, vehicle history and portal.
- Phase 12: reports, production readiness, backup, restore and critical flow validation.
