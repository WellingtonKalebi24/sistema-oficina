# Phase 5: Agenda e Recepcao - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers the operational agenda and physical vehicle reception flow for the workshop. It covers daily/weekly appointment views, appointment creation and editing, check-in from an appointment or direct check-in from customer/vehicle data, reception checklist data, photos/files/documents attached to the check-in, later consultation, tenant isolation and auditability.

It does not introduce diagnosis, quotes, work orders, finance, dashboard widgets, automatic reminders, customer communication, WhatsApp, email, SMS, push, notification center, delivery/read tracking or message-like counters.

</domain>

<decisions>
## Implementation Decisions

### Fluxo de entrada
- **D-01:** Check-in can start from an existing appointment or directly from tenant-scoped customer/vehicle data.
- **D-02:** Every completed check-in sets the operational status to `Aguardando diagnostico`.
- **D-03:** When a check-in starts from an appointment, the appointment status becomes `Convertido`.
- **D-04:** When a customer arrives without an appointment, direct check-in creates an automatically converted appointment for traceability.
- **D-05:** Check-in must always be linked to tenant-scoped customer and vehicle records. Backend validation remains authoritative.

### Checklist e anexos
- **D-06:** The check-in form should collect a complete reception checklist, but mileage and items left in the vehicle are optional.
- **D-07:** Required reception data should include customer, vehicle, entry date/time, fuel level and damage/checklist inspection data.
- **D-08:** Photos, documents and other files are always optional; missing attachments must not block check-in completion.
- **D-09:** Attachments use detailed categories: `Avaria`, `Documento`, `Painel`, `Motor`, `Interior`, `Outro`.
- **D-10:** After check-in completion, all check-in data may be edited when permitted, but every edit must be audited.
- **D-11:** Attachment access, mutation and deletion must respect tenant isolation and backend permission checks.

### Agenda visual
- **D-12:** The default agenda visualization is a list/table ordered by time.
- **D-13:** Tenant settings should allow the office to choose the agenda visualization model: time table, visual calendar or status kanban.
- **D-14:** The agenda visualization setting applies per office/tenant, not per user.
- **D-15:** In the table view, row actions should be limited to the main actions: `Fazer check-in`, `Editar`, `Cancelar`.
- **D-16:** On mobile, agenda rows show a compact summary and open details/actions in a separate screen or modal.
- **D-17:** The first agenda screen should treat the agenda timeline/table as the primary visual anchor; filters and check-in actions are secondary controls.

### The Agent's Discretion
- The planner may choose the exact data model, endpoint names, permission key names, upload storage strategy and UI component decomposition if the choices respect the locked decisions above, the approved UI-SPEC and the project constraints.
- The planner may implement the tenant-level visualization setting as a select/segmented option even if the user described it as checkbox, because only one visualization can be active at a time.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope And Requirements
- `.planning/PROJECT.md` - Core product value, tenant/security/audit constraints and communication prohibitions.
- `.planning/REQUIREMENTS.md` - Phase 5 requirements REC-01 through REC-08 and cross-cutting v1 constraints.
- `.planning/ROADMAP.md` - Phase 5 goal, scope, dependencies, risks and success criteria.
- `.planning/STATE.md` - Current project progress and carried decisions.

### Phase 5 Design And Discussion
- `.planning/phases/05-agenda-e-recep-o/05-UI-SPEC.md` - Approved visual and interaction contract for Phase 5 agenda, check-in, checklist and attachments.
- `.planning/phases/05-agenda-e-recep-o/05-DISCUSSION-LOG.md` - Human audit trail of options discussed; not primary planning input.

### Prior Phase Context
- `.planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md` - Backend authorization, configurable permissions, tenant isolation, session and audit decisions.
- `.planning/phases/03-clientes-e-ve-culos/03-CONTEXT.md` - Customer/vehicle linking, permissive vehicle UI preference, search and tenant-safe history decisions.
- `.planning/phases/04-servi-os-produtos-compras-e-estoque/04-CONTEXT.md` - Compact authenticated admin shell, backend-authoritative actions, tenant-scoped operational UI and required-marker preference.
- `docs/VISUAL_CONTRACT.md` - Baseline JO.IA visual contract for operational screens and states.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/app.ts` - Protected routers are mounted after `requireAuth`; Phase 5 routes should follow the same pattern.
- `apps/api/src/http/middleware/requirePermission.ts` - Backend permission enforcement pattern for agenda, reception and attachment actions.
- `apps/api/src/tenancy/tenantScope.ts` - Tenant scoping helpers to reuse for appointment, check-in and attachment records.
- `apps/api/src/audit/auditService.ts` - Audit logging service for appointment conversion, check-in creation/editing and attachment mutations.
- `apps/api/src/customers/customerService.ts` and `apps/api/src/customers/vehicleService.ts` - Existing tenant-scoped customer/vehicle data to link check-ins.
- `apps/web/src/App.tsx` - Current authenticated admin shell, compact panels, navigation groups and operational workspaces.
- `apps/web/src/api/customers.ts` and `apps/web/src/api/vehicles.ts` - Existing web API client patterns for tenant-scoped resources.
- `apps/web/src/design/formatters.ts` - Brazilian date/time and formatting helpers for agenda and reception rows.

### Established Patterns
- UI menus can hide unavailable features for usability, but backend 401/403 states remain authoritative.
- Operational screens use compact panels, tables, filters, empty states and explicit status messages instead of marketing layouts.
- Required fields are marked with a red `*`, but server validation remains the source of truth.
- Docker Compose and workspace scripts are expected to verify API, web and database behavior.

### Integration Points
- Phase 5 should add agenda/reception permission keys to the existing permission catalog and seed flow.
- Phase 5 should likely add new Prisma models for appointments, check-ins, checklist data and check-in attachments.
- Phase 5 should extend tenant settings or a related tenant-scoped configuration surface with the agenda visualization preference.
- Phase 5 web UI should add an `Agenda` operational nav item and reuse the existing authenticated shell.
- Attachment storage is not yet a general backend capability; Phase 5 planning must decide a tenant-safe storage path and API contract.

</code_context>

<specifics>
## Specific Ideas

- The user wants a practical table/list agenda as the default because it fits the workshop's day-to-day scanning.
- The tenant should later be able to switch agenda visualization between table, visual calendar and kanban.
- Direct check-in should still leave a trace in the agenda by creating a converted appointment automatically.
- The reception process should not get blocked by missing mileage, items left in the vehicle, photos or documents.
- All post-check-in edits are allowed only with audit, preserving correction flexibility without losing traceability.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 5 scope.

</deferred>

---

*Phase: 5-Agenda e Recepcao*
*Context gathered: 2026-07-24*
