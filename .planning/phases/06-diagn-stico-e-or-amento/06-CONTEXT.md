# Phase 6: Diagnóstico e Orçamento - Context

**Gathered:** 2026-07-28T13:30:00-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 delivers the internal diagnosis and quote workflow for the workshop. It covers creating diagnosis records for checked-in or registered vehicles, building draft quotes with service and product items, calculating item and quote totals, handling discounts and surcharges, publishing immutable quote versions, creating new versions, generating PDF output and exposing a secure link for manual copy/print delivery.

It does not implement the public approval page, customer decisions, approval/refusal capture, automatic WhatsApp/email/SMS/push sending, notification records, delivery/read tracking, work-order conversion or finance.

</domain>

<decisions>
## Implementation Decisions

### Fluxo diagnóstico -> orçamento
- **D-01:** Quote creation must support two entry points: from an existing reception check-in or directly from tenant-scoped customer/vehicle data.
- **D-02:** If a quote starts from a check-in, diagnosis is required before publishing the quote version.
- **D-03:** If a quote starts directly from customer/vehicle data, diagnosis text is optional so the workshop can create a simpler commercial quote.
- **D-04:** Diagnosis stores `problema`, `causa` and `recomendação`.
- **D-05:** Any user with quote permission can fill or update diagnosis data; a separate diagnosis-only permission is not required for this phase.

### Itens e valores do orçamento
- **D-06:** Quote items are modeled as a single list, but the UI and PDF should group them visually by services and products/parts.
- **D-07:** Discounts and surcharges can be applied both per item and to the quote total.
- **D-08:** Discount above the configured limit should show a warning only, not block saving or publishing. This intentionally overrides the original QTE-06 wording that required permission for discounts above limits.
- **D-09:** Quote validity date is required before publication.
- **D-10:** Estimated delivery deadline is optional.

### Versões e bloqueios
- **D-11:** A quote becomes a published version only through an explicit `Publicar versão` action.
- **D-12:** Draft quotes remain editable until publication.
- **D-13:** Published commercial data is immutable: item snapshots, quantities, prices, discounts, surcharges, validity and customer-facing commercial totals must not change in place.
- **D-14:** Non-commercial/administrative fields may be adjusted after publication when permitted and audited.
- **D-15:** Creating a new version copies the previously published version as the starting point.
- **D-16:** Phase 6 quote statuses are `Rascunho`, `Publicado`, `Enviado`, `Expirado` and `Cancelado`.
- **D-17:** `Enviado` is only a manual operational mark. It must not send messages, open WhatsApp/email automatically, or record delivery/read status.

### PDF e link manual
- **D-18:** The customer-facing PDF includes workshop data, customer, vehicle, quote validity, grouped service/product items, totals, customer-facing observations and diagnosis summary when present.
- **D-19:** The PDF may include diagnosis problem, cause and recommendation, but must not expose internal observations.
- **D-20:** PDF generation and secure link copy are available only after the quote version is published.
- **D-21:** The UI should provide `Copiar link` and `Imprimir/Gerar PDF` actions. Delivery happens outside the system.
- **D-22:** Customer-facing PDF/link must not show internal costs, margin, supplier data or internal notes.

### The Agent's Discretion
- The planner may choose exact Prisma model names, route names, permission key names, PDF rendering library and UI component decomposition if they preserve tenant isolation, backend authorization, auditability, immutable published versions and the no-automatic-communications boundary.
- The planner may decide how to store generated PDF metadata versus rendering on demand, as long as the PDF cannot diverge from the persisted published quote version.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope And Requirements
- `.planning/PROJECT.md` - Core product value, tenant/security/audit constraints and communication prohibitions.
- `.planning/REQUIREMENTS.md` - Phase 6 requirements QTE-01 through QTE-11, with D-08 intentionally overriding QTE-06's blocking-permission wording.
- `.planning/ROADMAP.md` - Phase 6 goal, scope, dependencies, risks and success criteria; Phase 7 boundary for public approval.
- `.planning/STATE.md` - Current project progress and carried decisions.

### Prior Phase Context
- `.planning/phases/03-clientes-e-ve-culos/03-CONTEXT.md` - Customer/vehicle linking, tenant safety and permissive vehicle UI preferences.
- `.planning/phases/04-servi-os-produtos-compras-e-estoque/04-CONTEXT.md` - Service/product catalog, transactional stock and reservation constraints.
- `.planning/phases/05-agenda-e-recep-o/05-CONTEXT.md` - Check-in, reception status, optional mileage/items and attachment boundaries.

### Visual Contract
- `docs/VISUAL_CONTRACT.md` - JO.IA operational UI baseline for compact admin screens, states and Brazilian formatting.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma/schema.prisma` - Existing tenant relations for customers, vehicles, catalog, stock, appointments and check-ins provide the integration anchors for quotes.
- `apps/api/src/permissions/permissions.ts` - Permission catalog pattern to extend with quote read/write/publish/PDF/link actions.
- `apps/api/src/http/middleware/requirePermission.ts` - Backend authorization pattern for every quote route.
- `apps/api/src/tenancy/tenantScope.ts` - Tenant-scope validation helpers to reuse when linking quotes to customer, vehicle, check-in, service and product records.
- `apps/api/src/audit/auditService.ts` - Audit service for diagnosis edits, quote publication, version creation, status changes and PDF/link actions.
- `apps/api/src/reception/checkInService.ts` - Check-in status and tenant-scoped check-in data that can seed diagnosis.
- `apps/api/src/stock/catalogService.ts` and `apps/api/src/stock/stockService.ts` - Service/product catalog and reservation data used by quote items.
- `apps/web/src/App.tsx` - Current authenticated shell, navigation groups and compact operational screen patterns.
- `apps/web/src/api/stock.ts`, `apps/web/src/api/reception.ts`, `apps/web/src/api/customers.ts`, `apps/web/src/api/vehicles.ts` - Web API client patterns for tenant-scoped resource loading and blocked states.
- `apps/web/src/design/formatters.ts` - Brazilian date/time/currency formatting for quote totals, validity and PDF previews.

### Established Patterns
- Backend 401/403 responses are authoritative; frontend hiding is only a usability aid.
- Operational screens use compact panels, tables, filters, empty states and explicit status messages.
- Required fields should show a red `*`, while backend validation remains the source of truth.
- Audit payloads should include concise IDs and changed fields, not raw long notes or sensitive/commercial internal data dumps.
- Published operational snapshots must avoid divergence from later catalog/customer/vehicle changes.

### Integration Points
- Add a `Orçamentos` operational view/menu item in the authenticated shell.
- Add quote-related permission keys to the seed and admin permission UI.
- Link quotes to tenant, customer, vehicle, optionally check-in, optionally diagnosis, service catalog entries and product records.
- When a published quote reserves parts, use existing stock reservation semantics without changing physical stock.
- PDF/link generation must read from published quote version snapshots, not mutable draft or current catalog rows.

</code_context>

<specifics>
## Specific Ideas

- The user wants the system flexible enough to create quotes from check-in or directly from customer/vehicle.
- The user prefers simple operational behavior: discount limit warnings should not block the workflow.
- The label `Enviado` is acceptable only as a manual status, despite the project's communication prohibition.
- The customer-facing artifact should include diagnosis context but hide internal business details.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 6 scope. Public quote viewing and approval remain Phase 7.

</deferred>

---

*Phase: 6-Diagnóstico e Orçamento*
*Context gathered: 2026-07-28T13:30:00-03:00*
