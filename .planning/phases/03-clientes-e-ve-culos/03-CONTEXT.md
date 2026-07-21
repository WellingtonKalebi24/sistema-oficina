# Phase 03 Context: Clientes e Veiculos

## Goal

Permitir gestao segura da base de clientes e veiculos da oficina, reutilizando a base autenticada, tenant-scoped e auditavel criada na Phase 2.

## Requirements

- CAV-01: create, edit, list and soft-delete customers within the tenant.
- CAV-02: create, edit, list and soft-delete vehicles within the tenant.
- CAV-03: link one or more vehicles to a customer.
- CAV-04: search customers by name, phone and document.
- CAV-05: search vehicles by plate and related customer.
- CAV-06: prevent duplicate customer or vehicle records according to configured unique fields.
- CAV-07: view basic customer and vehicle history.
- CAV-08: audit customer and vehicle changes.
- CAV-09: prevent customer and vehicle data from crossing tenant boundaries.

## Decisions

- **D-01:** Customer phone duplication is allowed for MVP because families and companies may share contact numbers; search should still find all matches.
- **D-02:** Active customer document duplication is a hard block inside a tenant when a document is provided.
- **D-03:** Active vehicle plate duplication is a hard block inside a tenant when a plate is provided.
- **D-04:** Active chassis/VIN duplication is a hard block inside a tenant when a chassis/VIN is provided.
- **D-05:** A vehicle has one current owner/customer link for the MVP, while ownership/link changes are preserved through audit/history.
- **D-06:** CPF/CNPJ values are normalized server-side and format-checked lightly; full check-digit validation can be added later.
- **D-07:** CNPJ handling must allow the 2026 alphanumeric format instead of assuming digits-only CNPJ forever.
- **D-08:** Customer and vehicle UI belongs inside the authenticated operational shell, not as public or marketing screens.
- **D-09:** Backend tenant scope and permission checks are authoritative; UI menu visibility is only usability.

## Scope Boundaries

- No customer messaging, WhatsApp, email delivery, reminders or notification center.
- No quote, work order, reception or finance records in this phase.
- No file/photo attachment workflow in this phase.
- No external validation service for CPF/CNPJ, plate or VIN.

## Validation Expectations

- Prisma/API tests for create, update, list, search, soft-delete, duplicate prevention, audit and tenant isolation.
- Web tests for authenticated customer/vehicle menu, forms, tables, search, empty/error states and permission-blocked states.
- Repository verification must remain green before the phase is considered complete.
