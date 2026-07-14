# Phase 1: Fundação Técnica e Contrato Visual - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the executable foundation for JO.IA: repository structure, local Docker environment, frontend/API/database startup, Prisma migration baseline, seed strategy, health check, error/logging baseline, lint/type/test commands, local setup docs and a JO.IA visual contract. It does not implement business modules such as authentication, customers, stock, quotes or work orders.

</domain>

<decisions>
## Implementation Decisions

### Workspace Shape

- **D-01:** Use a simple TypeScript workspace layout with separate frontend and backend applications and room for shared types only when needed. Recommended starting shape: `apps/web`, `apps/api`, `packages/shared`, `prisma`, `docs`.
- **D-02:** Prefer npm workspaces for the initial scaffold because Node/npm are already assumed and this avoids adding package-manager risk before the app exists.
- **D-03:** Keep frontend and backend runnable independently as well as through Docker Compose.

### Quality And Validation

- **D-04:** Phase 1 must define scripts for lint, format/check, type check and tests at the project root.
- **D-05:** Use strict TypeScript settings from the beginning for both web and API.
- **D-06:** Use automated tests that prove the foundation works, not just file existence. The minimum verification should include API health behavior and database connectivity.
- **D-07:** Keep mocks limited to tests; no permanent mock data should stand in for final behavior.

### Docker, Database And Configuration

- **D-08:** Docker Compose should include PostgreSQL plus the services needed to run the API and frontend locally.
- **D-09:** Prisma should own schema history through versioned migrations. Ad hoc database changes are out of bounds.
- **D-10:** Provide `.env.example` and documentation for required variables. Real `.env` files and secrets remain untracked.
- **D-11:** Development seed data should be deterministic, explicit and safe to rerun locally.

### Visual Contract

- **D-12:** JO.IA should feel like a serious operational SaaS for automotive shops: dense enough for repeated office use, calm, scannable and not marketing-like.
- **D-13:** The visual contract must define palette, typography, spacing, radius, shadows, buttons, forms, tables, filters, modals, status colors, loading states, empty states, error/success states, destructive confirmations, responsive behavior, keyboard focus and Brazilian date/time/currency formatting.
- **D-14:** Use restrained components with compact dashboards, tables and forms. Avoid oversized hero sections, decorative card-heavy layouts and one-note color palettes.
- **D-15:** Alerts in the eventual UI are visual calculations only; do not introduce notification centers, message counters or notification-like entities.

### the agent's Discretion

The planner may choose exact libraries for linting, formatting, testing and UI primitives if they fit the stack, keep Phase 1 small and preserve the constraints above. The planner should avoid adding framework complexity that is not needed for the foundation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope And Boundaries

- `PROJETO.md` — Original project specification, methodology constraints, forbidden notification behavior, stack, MVP flow and phase expectations.
- `.planning/PROJECT.md` — Consolidated product context, core value, constraints and key decisions.
- `.planning/REQUIREMENTS.md` — Phase 1 requirements `FND-01` through `FND-08` and `VUX-01` through `VUX-05`.
- `.planning/ROADMAP.md` — Phase 1 goal, scope, risks, dependencies and success criteria.
- `.planning/STATE.md` — Current project state and pending Phase 1 decisions.

### Research

- `.planning/research/STACK.md` — Selected stack and implementation notes.
- `.planning/research/ARCHITECTURE.md` — Cross-cutting architecture concerns including tenancy, authorization, transactions and audit.
- `.planning/research/FEATURES.md` — Table-stakes feature categories and explicit prohibitions.
- `.planning/research/PITFALLS.md` — Security, integrity, scope and production risks.
- `.planning/research/SUMMARY.md` — High-level research summary and watch-outs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- No application source code exists yet.
- `PROJETO.md` and `.planning/` are the only project assets to preserve as source-of-truth planning inputs.

### Established Patterns

- No code patterns exist yet. Phase 1 must establish conventions deliberately and document how to run validation.
- GSD planning artifacts are versioned in git and should remain the coordination backbone.

### Integration Points

- New implementation should connect to `AGENTS.md` guidance and the `.planning/` artifacts.
- Future phase work should update `.planning/STATE.md` through GSD state tooling rather than ad hoc edits when a handler exists.

</code_context>

<specifics>
## Specific Ideas

- The interface should support office/staff workflows, not a public marketing experience.
- The visual language should prioritize operational clarity, tables, forms, filters, status colors and fast scanning.
- No automatic customer communication should be introduced under the name of alerts, reminders or portal behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Fundação Técnica e Contrato Visual*
*Context gathered: 2026-07-14*
