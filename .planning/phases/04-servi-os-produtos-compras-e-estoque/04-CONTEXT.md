---
phase: 4
phase_name: "Servicos, Produtos, Compras e Estoque"
created_at: "2026-07-22"
source: "user requested Phase 4 start after vehicle form unblock"
---

# Phase 4 Context

## Locked Direction

- Build Phase 4 as an MVP operational slice for service catalog, product catalog, suppliers, purchases and stock movements.
- Keep the existing stack: React/Vite/TypeScript web, Node/Express/TypeScript API, PostgreSQL, Prisma and Docker Compose.
- Backend authorization remains authoritative. Frontend menus and buttons are convenience only.
- All Phase 4 data must be tenant-scoped from the authenticated session.
- Critical stock writes must be transactional: purchase entries, exits, adjustments, reservations and reservation cancellations.
- Audit critical stock and catalog changes with tenant, user, action, entity, record id, timestamp and concise metadata.
- Do not introduce automatic customer communication, WhatsApp automation, notification delivery, read receipts or message history.

## User Preference Captured

- Vehicle registration must remain permissive for now. Do not reintroduce strict vehicle form validation while implementing Phase 4.
- Required fields should be visually marked with a red `*`, but backend validation must remain the source of truth.
- Continue using the existing authenticated admin shell and shadcn-style local UI primitives.

## Phase 4 Scope

- Service catalog entries for labor/services.
- Product categories and products.
- Suppliers.
- Purchases and purchase items.
- Stock entries from purchases.
- Stock exits with origin tracking.
- Authorized stock adjustments with reason.
- Minimum stock configuration and low-stock visual alerts.
- Stock movement history.
- Reservations and reservation cancellation without corrupting physical stock balance.

## Requirements

- STK-01: create, edit, list and deactivate service catalog entries.
- STK-02: create product categories and products.
- STK-03: create and manage suppliers.
- STK-04: register purchases and purchase items.
- STK-05: purchase entry increases product stock through a transactional movement.
- STK-06: authorized user can register stock exits with origin tracking.
- STK-07: authorized user can register stock adjustments with reason and audit.
- STK-08: configure minimum stock for products.
- STK-09: calculate low-stock visual alerts from current stock data.
- STK-10: reserve parts for a quote or work order without corrupting physical balance.
- STK-11: cancel a reservation and restore availability.
- STK-12: inspect stock movement history with source operation.
- STK-13: concurrent stock operations do not produce negative or incorrect balances.
- STK-14: catalog, supplier and stock data cannot cross tenant boundaries.

## Implementation Notes For Planning

- Start with Prisma schema and RED API tests for service/product/supplier/purchase/stock contracts.
- Prefer explicit stock ledger rows over mutating balances without history.
- Product availability should be derived or updated transactionally from physical quantity minus active reservations.
- Avoid broad UI polish work outside the operational screens needed for Phase 4 verification.
