# Requirements: JO.IA - Sistema de Gestão para Oficina Automotiva

**Defined:** 2026-07-14
**Core Value:** Uma oficina consegue executar e auditar todo o ciclo de atendimento de um veículo, da entrada ao pagamento, com isolamento seguro por tenant e sem depender de comunicações automáticas com o cliente.

## v1 Requirements

### Foundation

- [x] **FND-01**: Developer can run the web app, API and PostgreSQL locally through Docker Compose.
- [ ] **FND-02**: Developer can execute database migrations from a clean PostgreSQL database.
- [x] **FND-03**: Developer can run lint, formatting check, type check and automated tests for the project.
- [ ] **FND-04**: API exposes a health check that verifies application startup and database connectivity.
- [ ] **FND-05**: API handles errors through a global error strategy that avoids leaking secrets.
- [ ] **FND-06**: Application emits structured logs with enough context for debugging and audit follow-up.
- [ ] **FND-07**: Developer can seed controlled development data without affecting production configuration.
- [x] **FND-08**: Developer can follow local setup documentation to start and verify the system.

### Identity And Tenant

- [x] **IDT-01**: Admin can create and manage a tenant and its company settings.
- [x] **IDT-02**: Admin can create, edit, deactivate and list users within the authenticated tenant.
- [x] **IDT-03**: Admin can create roles and assign permissions to users.
- [x] **IDT-04**: Admin can grant user-specific permission overrides.
- [x] **IDT-05**: User can log in with secure password verification.
- [x] **IDT-06**: User session can be refreshed with secure refresh token handling.
- [x] **IDT-07**: User can log out and invalidate the active session.
- [x] **IDT-08**: User can request and complete a secure password reset.
- [x] **IDT-09**: User can change password after authentication.
- [x] **IDT-10**: API blocks protected routes when authentication is missing or invalid.
- [x] **IDT-11**: API blocks actions when the authenticated user lacks required permission.
- [x] **IDT-12**: User from one tenant cannot read or modify data from another tenant.
- [x] **IDT-13**: Authentication, permission and sensitive user-management events are audited.

### Customers And Vehicles

- [x] **CAV-01**: User can create, edit, list and soft-delete customers within the tenant.
- [x] **CAV-02**: User can create, edit, list and soft-delete vehicles within the tenant.
- [x] **CAV-03**: User can link one or more vehicles to a customer.
- [x] **CAV-04**: User can search customers by name, phone and document.
- [x] **CAV-05**: User can search vehicles by plate and related customer.
- [x] **CAV-06**: System prevents duplicate customer or vehicle records according to configured unique fields.
- [x] **CAV-07**: User can view basic customer and vehicle history.
- [x] **CAV-08**: Customer and vehicle changes are audited.
- [x] **CAV-09**: Customer and vehicle data cannot cross tenant boundaries.

### Catalog And Stock

- [x] **STK-01**: User can create, edit, list and deactivate service catalog entries.
- [x] **STK-02**: User can create product categories and products.
- [x] **STK-03**: User can create and manage suppliers.
- [x] **STK-04**: User can register purchases and purchase items.
- [x] **STK-05**: Purchase entry increases product stock through a transactional stock movement.
- [x] **STK-06**: Authorized user can register stock exits with origin tracking.
- [x] **STK-07**: Authorized user can register stock adjustments with reason and audit.
- [x] **STK-08**: User can configure minimum stock for products.
- [x] **STK-09**: System calculates low-stock visual alerts from current stock data.
- [x] **STK-10**: User can reserve parts for a quote or work order without corrupting physical balance.
- [x] **STK-11**: User can cancel a reservation and restore availability.
- [x] **STK-12**: User can inspect stock movement history with source operation.
- [x] **STK-13**: Concurrent stock operations do not produce negative or incorrect balances.
- [x] **STK-14**: Catalog, supplier and stock data cannot cross tenant boundaries.

### Scheduling And Reception

- [x] **REC-01**: User can create, edit and view appointments in daily and weekly agenda views.
- [x] **REC-02**: User can associate appointment with customer and vehicle.
- [x] **REC-03**: User can perform vehicle check-in from an appointment or directly from customer/vehicle data.
- [x] **REC-04**: User can record checklist items, mileage, fuel level, damage notes and items left in the vehicle.
- [x] **REC-05**: User can attach photos and files to the check-in record.
- [x] **REC-06**: User can consult check-in records after reception.
- [x] **REC-07**: Reception data and attachments cannot cross tenant boundaries.
- [x] **REC-08**: Relevant reception changes are audited.

### Quote And Approval

- [ ] **QTE-01**: User can create a diagnosis for a checked-in or registered vehicle.
- [ ] **QTE-02**: User can add recommended services and parts to a diagnosis.
- [ ] **QTE-03**: User can create a quote from diagnosis data.
- [ ] **QTE-04**: User can add service and product items to a quote.
- [ ] **QTE-05**: System calculates quote subtotal, discounts, surcharges and total correctly.
- [ ] **QTE-06**: Discount above configured limits requires permission.
- [ ] **QTE-07**: User can define quote validity and estimated delivery deadline.
- [ ] **QTE-08**: User can publish a quote version that preserves commercial data immutably.
- [ ] **QTE-09**: User can create a new quote version without altering prior versions.
- [ ] **QTE-10**: User can generate and inspect a PDF for a quote version.
- [ ] **QTE-11**: User can print or manually copy a secure approval link for a quote version.
- [ ] **QTE-12**: Public visitor can view only authorized quote data through a valid token.
- [ ] **QTE-13**: Invalid, expired or unrelated public tokens do not reveal protected information.
- [ ] **QTE-14**: Public visitor can approve all items, approve selected items, reject selected items or reject the quote.
- [ ] **QTE-15**: Public visitor can add an observation and confirm their name during approval.
- [ ] **QTE-16**: Approval decision is bound to the exact quote version viewed.
- [ ] **QTE-17**: System records first view, decision time, approved/refused items, technical metadata and audit data when permitted.
- [ ] **QTE-18**: Quote data and approval decisions cannot cross tenant boundaries.

### Work Orders And Production

- [ ] **WOP-01**: User can convert an approved quote version into a work order transactionally.
- [ ] **WOP-02**: Converted work order includes only approved items.
- [ ] **WOP-03**: Work order items preserve snapshots of approved descriptions and prices.
- [ ] **WOP-04**: User can create, view and update work order status according to allowed transitions.
- [ ] **WOP-05**: System blocks invalid status transitions.
- [ ] **WOP-06**: Authorized user can reopen a work order with audit.
- [ ] **WOP-07**: User can assign responsible users and deadlines to a work order.
- [ ] **WOP-08**: User can attach photos and files to a work order.
- [ ] **WOP-09**: User can create, assign, prioritize and reorder work order tasks.
- [ ] **WOP-10**: User can update task status and see the change reflected in a production board.
- [ ] **WOP-11**: System identifies delayed tasks and delayed work orders through calculated visual alerts.
- [ ] **WOP-12**: Using parts in a work order updates stock transactionally.
- [ ] **WOP-13**: Work order status changes, reopening and part usage are audited.
- [ ] **WOP-14**: Work order and production data cannot cross tenant boundaries.

### Finance

- [ ] **FIN-01**: User can create financial categories.
- [ ] **FIN-02**: User can register accounts receivable linked to a work order or source operation.
- [ ] **FIN-03**: User can register accounts payable with due date and status.
- [ ] **FIN-04**: User can register full and partial payments.
- [ ] **FIN-05**: Payment updates pending balance transactionally.
- [ ] **FIN-06**: Authorized user can reverse a payment with traceable inverse movement.
- [ ] **FIN-07**: User can open, view and close cash registers.
- [ ] **FIN-08**: System keeps cash totals consistent with cash movements.
- [ ] **FIN-09**: User can register expenses.
- [ ] **FIN-10**: User can track financial status of a work order.
- [ ] **FIN-11**: User can register commissions when applicable.
- [ ] **FIN-12**: System calculates visual alerts for overdue payments.
- [ ] **FIN-13**: Critical financial operations use database transactions.
- [ ] **FIN-14**: Financial actions and reversals are audited.
- [ ] **FIN-15**: Financial data cannot cross tenant boundaries.

### Dashboard, Portal And Reports

- [ ] **DPR-01**: User can view a dashboard with real operational data for open work orders, production, quotes, stock, agenda, payments, expenses and revenue.
- [ ] **DPR-02**: Dashboard visual alerts are calculated from existing data and do not create notification records.
- [ ] **DPR-03**: User can view complete vehicle history with services, parts, mileage, photos and allowed financial values.
- [ ] **DPR-04**: Customer can access a portal and view only their own authorized vehicles, quotes, work orders, released photos, documents, warranties, payments and maintenance records.
- [ ] **DPR-05**: Portal never exposes internal costs, margin, supplier data, internal notes, administrative logs, permissions or data from other customers/tenants.
- [ ] **DPR-06**: User can generate essential reports with tenant-safe filters.
- [ ] **DPR-07**: User can export report data without crossing tenant boundaries.
- [ ] **DPR-08**: Admin can inspect audit logs for relevant operational and administrative events.
- [ ] **DPR-09**: Developer can execute critical integration or end-to-end tests for the complete MVP flow.
- [ ] **DPR-10**: Operator can perform and verify backup restoration.
- [ ] **DPR-11**: Deployment documentation covers environment variables, migrations, backup, restore, observability and production readiness.

### Visual And UX

- [ ] **VUX-01**: Team can reference a JO.IA visual contract before implementing major screens.
- [ ] **VUX-02**: UI uses consistent palette, typography, spacing, radius, shadows, buttons, forms, tables, filters, modals and status colors.
- [ ] **VUX-03**: UI includes loading, skeleton, empty, success, error and destructive confirmation states.
- [ ] **VUX-04**: UI supports minimum accessibility requirements including contrast and keyboard focus.
- [ ] **VUX-05**: UI presents dates, times and monetary values consistently in Portuguese/Brazilian business context.

## v2 Requirements

### Future Product Depth

- **FUT-01**: User can configure advanced report templates beyond essential reports.
- **FUT-02**: User can manage advanced analytics after the MVP operational flow is stable.
- **FUT-03**: Customer portal can gain additional self-service views that do not involve notifications or automatic communication.
- **FUT-04**: System can support additional deployment targets after the first production path is validated.
- **FUT-05**: System can add advanced inventory valuation rules after transactional stock correctness is proven.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic WhatsApp sending | Explicitly prohibited; communication is manual and external to the system |
| Automatic email sending | Explicitly prohibited; system must not send customer communications |
| SMS or push notifications | Explicitly prohibited communication automation |
| Notification center, bell, inbox or message counters | Internal persistent notifications are prohibited |
| Notification entities or message queue entities | Entity family is explicitly forbidden |
| "Send by WhatsApp" or "Send by email" buttons | Product must only allow copy/print/manual delivery actions |
| BMAD workflows, BMAD stories and story points | Methodology explicitly prohibited |
| Completing the system in one implementation pass | Project must proceed by small verifiable phases |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Pending |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Pending |
| FND-05 | Phase 1 | Pending |
| FND-06 | Phase 1 | Pending |
| FND-07 | Phase 1 | Pending |
| FND-08 | Phase 1 | Complete |
| IDT-01 | Phase 2 | Complete |
| IDT-02 | Phase 2 | Complete |
| IDT-03 | Phase 2 | Complete |
| IDT-04 | Phase 2 | Complete |
| IDT-05 | Phase 2 | Complete |
| IDT-06 | Phase 2 | Complete |
| IDT-07 | Phase 2 | Complete |
| IDT-08 | Phase 2 | Complete |
| IDT-09 | Phase 2 | Complete |
| IDT-10 | Phase 2 | Complete |
| IDT-11 | Phase 2 | Complete |
| IDT-12 | Phase 2 | Complete |
| IDT-13 | Phase 2 | Complete |
| CAV-01 | Phase 3 | Complete |
| CAV-02 | Phase 3 | Complete |
| CAV-03 | Phase 3 | Complete |
| CAV-04 | Phase 3 | Complete |
| CAV-05 | Phase 3 | Complete |
| CAV-06 | Phase 3 | Complete |
| CAV-07 | Phase 3 | Complete |
| CAV-08 | Phase 3 | Complete |
| CAV-09 | Phase 3 | Complete |
| STK-01 | Phase 4 | Complete |
| STK-02 | Phase 4 | Complete |
| STK-03 | Phase 4 | Complete |
| STK-04 | Phase 4 | Complete |
| STK-05 | Phase 4 | Complete |
| STK-06 | Phase 4 | Complete |
| STK-07 | Phase 4 | Complete |
| STK-08 | Phase 4 | Complete |
| STK-09 | Phase 4 | Complete |
| STK-10 | Phase 4 | Complete |
| STK-11 | Phase 4 | Complete |
| STK-12 | Phase 4 | Complete |
| STK-13 | Phase 4 | Complete |
| STK-14 | Phase 4 | Complete |
| REC-01 | Phase 5 | Complete |
| REC-02 | Phase 5 | Complete |
| REC-03 | Phase 5 | Complete |
| REC-04 | Phase 5 | Complete |
| REC-05 | Phase 5 | Complete |
| REC-06 | Phase 5 | Complete |
| REC-07 | Phase 5 | Complete |
| REC-08 | Phase 5 | Complete |
| QTE-01 | Phase 6 | Pending |
| QTE-02 | Phase 6 | Pending |
| QTE-03 | Phase 6 | Pending |
| QTE-04 | Phase 6 | Pending |
| QTE-05 | Phase 6 | Pending |
| QTE-06 | Phase 6 | Pending |
| QTE-07 | Phase 6 | Pending |
| QTE-08 | Phase 6 | Pending |
| QTE-09 | Phase 6 | Pending |
| QTE-10 | Phase 6 | Pending |
| QTE-11 | Phase 6 | Pending |
| QTE-12 | Phase 7 | Pending |
| QTE-13 | Phase 7 | Pending |
| QTE-14 | Phase 7 | Pending |
| QTE-15 | Phase 7 | Pending |
| QTE-16 | Phase 7 | Pending |
| QTE-17 | Phase 7 | Pending |
| QTE-18 | Phase 7 | Pending |
| WOP-01 | Phase 8 | Pending |
| WOP-02 | Phase 8 | Pending |
| WOP-03 | Phase 8 | Pending |
| WOP-04 | Phase 8 | Pending |
| WOP-05 | Phase 8 | Pending |
| WOP-06 | Phase 8 | Pending |
| WOP-07 | Phase 8 | Pending |
| WOP-08 | Phase 8 | Pending |
| WOP-09 | Phase 9 | Pending |
| WOP-10 | Phase 9 | Pending |
| WOP-11 | Phase 9 | Pending |
| WOP-12 | Phase 8 | Pending |
| WOP-13 | Phase 8 | Pending |
| WOP-14 | Phase 8 | Pending |
| FIN-01 | Phase 10 | Pending |
| FIN-02 | Phase 10 | Pending |
| FIN-03 | Phase 10 | Pending |
| FIN-04 | Phase 10 | Pending |
| FIN-05 | Phase 10 | Pending |
| FIN-06 | Phase 10 | Pending |
| FIN-07 | Phase 10 | Pending |
| FIN-08 | Phase 10 | Pending |
| FIN-09 | Phase 10 | Pending |
| FIN-10 | Phase 10 | Pending |
| FIN-11 | Phase 10 | Pending |
| FIN-12 | Phase 10 | Pending |
| FIN-13 | Phase 10 | Pending |
| FIN-14 | Phase 10 | Pending |
| FIN-15 | Phase 10 | Pending |
| DPR-01 | Phase 11 | Pending |
| DPR-02 | Phase 11 | Pending |
| DPR-03 | Phase 11 | Pending |
| DPR-04 | Phase 11 | Pending |
| DPR-05 | Phase 11 | Pending |
| DPR-06 | Phase 12 | Pending |
| DPR-07 | Phase 12 | Pending |
| DPR-08 | Phase 12 | Pending |
| DPR-09 | Phase 12 | Pending |
| DPR-10 | Phase 12 | Pending |
| DPR-11 | Phase 12 | Pending |
| VUX-01 | Phase 1 | Pending |
| VUX-02 | Phase 1 | Pending |
| VUX-03 | Phase 1 | Pending |
| VUX-04 | Phase 1 | Pending |
| VUX-05 | Phase 1 | Pending |

**Coverage:**

- v1 requirements: 115 total
- Mapped to phases: 115
- Unmapped: 0

---
*Requirements defined: 2026-07-14*
*Last updated: 2026-07-14 after initial GSD requirements generation*
