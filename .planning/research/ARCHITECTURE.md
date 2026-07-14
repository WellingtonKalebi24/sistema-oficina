# Architecture Research: JO.IA

## Architectural Shape

JO.IA should start as a modular web application with a React/Vite frontend, an Express API and a PostgreSQL database accessed through Prisma. The architecture should favor explicit domain modules over a single large generic service layer.

## Core Cross-Cutting Concerns

### Tenant Isolation

- Tenant context must come from authentication or secure public token scope.
- Backend queries must filter by tenant.
- Relationship writes must reject IDs from another tenant.
- Exports, reports, files and attachments must respect tenant boundaries.
- Tests must prove cross-tenant access is blocked.

### Authorization

- Permissions must be enforced in backend request handling and service logic.
- UI controls may hide unavailable actions, but backend remains the source of truth.
- Sensitive actions need audit entries.

### Transactions

Use database transactions for:

- Quote approval and conversion to work order.
- Work order creation and item creation.
- Stock reservation, release, consumption and adjustment.
- Purchase entries and stock movement creation.
- Payments, partial payments, reversals, account liquidation and cash movement creation.
- Work order finalization and reopening.

### Audit

Audit should capture tenant, user, action, entity, record ID, timestamp, relevant before/after values and technical context. It must not store passwords, complete tokens, card data or secrets.

### Public Approval Links

Public token routes must reveal only the linked quote version and explicitly allowed data. Invalid or expired tokens must fail without leaking resource existence.

## Data Model Starting Point

Initial entities are listed in `PROJETO.md`, including `Tenant`, `CompanySetting`, `User`, `Role`, `Permission`, `Customer`, `Vehicle`, `Quote`, `QuoteVersion`, `QuoteApproval`, `WorkOrder`, `StockMovement`, finance entities, attachments and `AuditLog`.

The `Notification` family of entities is prohibited. `MaintenanceReminder` is allowed only as a future maintenance record, not as a communication trigger.

## Visual Architecture

Before building the main screens, define a JO.IA visual contract covering palette, typography, spacing, component behavior, status colors, tables, filters, forms, modals, loading states, empty states, destructive confirmations, accessibility and responsive behavior.
