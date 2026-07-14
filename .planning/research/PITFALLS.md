# Pitfalls Research: JO.IA

## Security And Privacy Risks

- Cross-tenant reads or writes caused by missing tenant filters.
- Public approval links exposing internal notes, supplier data, costs or predictable identifiers.
- Token storage or reset flows leaking secrets.
- Authorization implemented only in the frontend.
- Audit logs accidentally storing passwords, full tokens or sensitive payment data.

## Business Integrity Risks

- Quote approval not bound to the exact quote version.
- A changed quote version reinterpreting a previous customer decision.
- Work order items using mutable catalog prices instead of snapshots.
- Partial approval converting refused items as authorized work.
- Financial totals diverging from cash movements or receivable/payable records.

## Stock And Concurrency Risks

- Stock reservations corrupting physical balance.
- Concurrent stock movements producing incorrect available quantities.
- Manual adjustments without permission or audit.
- Purchase entry and stock movement written partially.

## Product Scope Risks

- Reintroducing notification features through dashboard, portal, quotes or maintenance reminders.
- Building all modules at once and losing verifiability.
- Accepting mock data as final implementation.
- Creating UI before establishing a visual contract.
- Marking phases complete based on file existence instead of executable validation.

## Production Risks

- No backup and restore verification.
- Missing environment variable documentation.
- Incomplete migrations or seeds.
- Logs without enough context for audit and debugging.
- Reports or exports ignoring tenant boundaries.
