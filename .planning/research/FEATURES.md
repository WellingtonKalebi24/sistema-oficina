# Feature Research: Oficina Automotiva

## Table Stakes For MVP

### Foundation

- Project structure for web, API and database.
- Docker Compose local environment.
- Health check, error handling, structured logging, lint, formatting, type check, tests, migrations and seed.

### Identity, Tenant And Permissions

- Tenant and company settings.
- Users, roles, permissions and per-user permission overrides.
- Login, refresh token, logout, password recovery and password change.
- Route protection, backend authorization and access audit.

### Customer And Vehicle Registry

- Customer and vehicle records.
- Customer/vehicle relationship.
- Search by name, phone, document and plate.
- Basic history, soft deletion, duplicate validation and audit.

### Services, Products, Purchasing And Stock

- Service catalog, product categories, products and suppliers.
- Purchases, purchase items and stock entries.
- Stock exits, authorized adjustments, minimum stock, reservation and cancellation.
- Stock movement history, origin tracking and audit.

### Scheduling And Reception

- Daily and weekly agenda.
- Appointment creation and editing.
- Vehicle check-in, entry checklist, mileage, fuel level, damage notes, photos, attachments and items left in the vehicle.

### Diagnosis, Quote And Approval

- Diagnosis with recommended services and parts.
- Quote creation, service/product items, authorized discount, surcharge, validity, estimated deadline, subtotal and total.
- Quote versioning, PDF generation, print support and secure approval link.
- Public approval by token with total approval, partial approval, refusal, customer observation, confirmed name and technical audit metadata.

### Work Order And Production

- Work order creation from approved quote.
- Work order items with snapshots of descriptions and prices.
- Status transitions, status history, assignees, deadlines, photos, attachments, finishing rules and authorized reopening.
- Work order tasks, priority, Kanban board, overdue task visibility and permission checks.

### Finance

- Payments, partial payments, installments, accounts receivable, accounts payable, financial categories, expenses, cash register, cash movements, reversals, cash flow, work order financial status and commissions.

### Dashboard, History, Portal And Reports

- Operational dashboard using real data and visual calculated alerts.
- Vehicle history, services, used parts, mileage and allowed values.
- Customer portal with authorized data only.
- Essential reports, exports, administrative audit, security review, integration tests, E2E tests, documentation, backup, restore test and production preparation.

## Explicitly Forbidden

- Automatic WhatsApp, email, SMS or push communication.
- Automatic reminders or customer contact automation.
- Notification center, bell, inbox, persistent internal notification history or message counters.
- Entities dedicated to notifications or message delivery.
- Buttons such as "Send by WhatsApp" or "Send by email".

## Allowed Alerts

- Low stock.
- Delayed work order.
- Quote near expiration.
- Overdue payment.
- Vehicle expected for delivery.
- Delayed task.

These alerts must be calculated from existing data and must not create notification records or outbound communication.
