# Phase 05 - Validation Architecture

**Phase:** 05 - Agenda e Recepcao  
**Created:** 2026-07-24  
**Purpose:** Mapear requisitos REC-01..REC-08 e decisoes D-01..D-17 para verificacoes executaveis.

## Nyquist Strategy

Cada comportamento de Phase 5 deve aparecer em pelo menos um teste automatizado antes da conclusao do plano que implementa o comportamento. A fase nao pode ser considerada completa somente por arquivos criados, telas visiveis ou endpoints existentes.

## Automated Gates

| Gate | Command | Covers |
|------|---------|--------|
| Migration gate | `npm run db:migrate` | Prisma schema, migrations de agenda, check-in, anexos e agendaViewMode |
| API reception contracts | `npm run test -w apps/api -- reception-contract` | REC-01..REC-04, REC-06, D-01..D-07, D-12..D-15, D-17 |
| API isolation | `npm run test -w apps/api -- reception-isolation` | REC-02, REC-07, D-05, D-11, D-14 |
| API audit | `npm run test -w apps/api -- reception-audit` | REC-08, D-03, D-04, D-10, D-11 |
| API attachments | `npm run test -w apps/api -- reception-attachments` | REC-05, REC-07, REC-08, D-08, D-09, D-11 |
| Web reception UI | `npm run test -w apps/web -- reception-ui` | REC-01, REC-03..REC-06, D-01, D-06..D-17, UI-SPEC copy and responsive behavior |
| Workspace quality | `npm run typecheck -w apps/api && npm run typecheck -w apps/web && npm run lint -w apps/api && npm run lint -w apps/web` | Type safety and lint for touched workspaces |
| Docker/config | `npm run docker:config` | Compose validity, including upload storage wiring |
| Phase gate | `npm run verify` | Full project verification before Phase 5 completion |

## Requirements Test Map

| Requirement | Executable Check | Required Evidence |
|-------------|------------------|-------------------|
| REC-01 | `reception-contract`, `reception-ui` | Appointment create/edit/cancel and daily/weekly views return persisted tenant data ordered by time. |
| REC-02 | `reception-contract`, `reception-isolation` | Appointment customerId/vehicleId must belong to authenticated tenant; cross-tenant IDs are blocked by backend. |
| REC-03 | `reception-contract`, `reception-ui` | Check-in succeeds from appointment and direct customer/vehicle path. |
| REC-04 | `reception-contract`, `reception-ui` | Fuel level and damage/checklist inspection are required; mileage and items left are optional but persisted when supplied. |
| REC-05 | `reception-attachments`, `reception-ui` | Optional upload/list/download/delete works for check-in attachments with protected API access. |
| REC-06 | `reception-contract`, `reception-ui` | Completed check-ins are listed and detail view shows checklist and attachment metadata. |
| REC-07 | `reception-isolation`, `reception-attachments` | Reception records and attachment bytes/metadata cannot cross tenants. |
| REC-08 | `reception-audit`, `reception-attachments` | Appointment conversion, check-in create/edit, and attachment upload/delete create audit rows. |

## Decision Test Map

| Decision | Executable Check | Required Evidence |
|----------|------------------|-------------------|
| D-01 | `reception-contract`, `reception-ui` | Tests cover both appointment-origin and direct customer/vehicle check-in. |
| D-02 | `reception-contract` | Completed check-in status is exactly `Aguardando diagnostico`. |
| D-03 | `reception-contract`, `reception-audit` | Appointment-origin check-in changes appointment status to `Convertido` and audits conversion. |
| D-04 | `reception-contract`, `reception-audit` | Direct check-in creates a trace appointment already `Convertido` in the same transaction. |
| D-05 | `reception-contract`, `reception-isolation` | Backend rejects check-in without tenant-scoped customer and vehicle records. |
| D-06 | `reception-contract`, `reception-ui` | Mileage and items left are optional; checklist fields remain available. |
| D-07 | `reception-contract`, `reception-ui` | Customer, vehicle, entry date/time, fuel level, and damage/checklist inspection are required by backend validation. |
| D-08 | `reception-contract`, `reception-attachments`, `reception-ui` | Missing files never block check-in completion. |
| D-09 | `reception-attachments`, `reception-ui` | Persisted attachment categories are `Avaria`, `Documento`, `Painel`, `Motor`, `Interior`, `Outro`. |
| D-10 | `reception-audit`, `reception-ui` | Post-check-in edits are allowed when permitted and every relevant edit is audited. |
| D-11 | `reception-attachments`, `reception-isolation` | Attachment read/write/delete require tenant ownership and backend permissions. |
| D-12 | `reception-ui` | Default agenda view is a time-ordered table/list. |
| D-13 | `reception-contract`, `reception-ui` | Tenant settings can select table, calendar, or kanban agenda visualization. |
| D-14 | `reception-isolation` | Agenda visualization setting is stored per tenant/company settings, not per user. |
| D-15 | `reception-ui` | Agenda table row actions are limited to Fazer check-in, Editar, Cancelar. |
| D-16 | `reception-ui` | Mobile agenda/check-in rows show compact summary and open detail/actions in modal or screen. |
| D-17 | `reception-ui` | First agenda screen uses timeline/table as the primary visual anchor; filters/actions are secondary. |

## Negative Scope Gates

| Prohibited Scope | Check |
|------------------|-------|
| Automatic customer communications | `Select-String -Path apps/web/src/App.tsx,apps/web/src/test/reception-ui.test.tsx -Pattern 'WhatsApp|email|notificacao|mensagem|envio|entrega|leitura|lembrete automatico'` must find no newly introduced customer communication controls. |
| Public upload exposure | `Select-String -Path apps/api/src/app.ts,apps/api/src/http/routes/*.ts -Pattern 'express.static|/uploads'` must not show a public static mount for reception files. |
| Attachment path trust | `reception-attachments` must include traversal/cross-tenant download/delete attempts. |

## Final Phase Evidence

The final Phase 5 summary must list command results for:

1. `npm run db:migrate`
2. `npm run test -w apps/api -- reception-contract reception-isolation reception-audit reception-attachments`
3. `npm run test -w apps/web -- reception-ui`
4. `npm run typecheck -w apps/api && npm run typecheck -w apps/web`
5. `npm run lint -w apps/api && npm run lint -w apps/web`
6. `npm run docker:config`
7. `npm run verify`
