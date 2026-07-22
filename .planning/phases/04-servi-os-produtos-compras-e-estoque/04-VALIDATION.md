# Phase 04 Validation Plan

**Phase:** Servicos, Produtos, Compras e Estoque  
**Created:** 2026-07-22  
**Purpose:** Close Nyquist validation coverage for STK-01 through STK-14 before Phase 4 execution.

## Validation Architecture

Phase 4 validation is test-first at Wave 0. The executor must create the missing automated tests before production implementation and keep them in the phase verification set until `npm run verify` passes.

## Wave 0 Test Gaps

| Gap | File | Required Coverage | Automated Command |
|-----|------|-------------------|-------------------|
| API stock contract tests | `apps/api/src/test/stock-contract.test.ts` | STK-01 through STK-12 and STK-14 catalog, supplier, purchase, movement, reservation and tenant isolation behavior | `npm run test -w apps/api -- stock-contract` |
| API concurrency tests | `apps/api/src/test/stock-concurrency.test.ts` | STK-13 concurrent purchase/exit/adjustment/reservation correctness | `npm run test -w apps/api -- stock-concurrency` |
| Web stock UI tests | `apps/web/src/test/stock-ui.test.tsx` | Phase 4 UI contract, blocked states, required markers, low-stock visual state and no vehicle validation regression | `npm run test -w apps/web -- stock-ui` |
| Prisma schema baseline update | `apps/api/src/test/prisma-baseline.test.ts` | Phase 4 schema presence and continued absence of prohibited communication entities | `npm run test -w apps/api -- prisma-baseline` |

## Requirement Verification Map

| Req ID | Required Automated Evidence | Primary Plan |
|--------|-----------------------------|--------------|
| STK-01 | `stock-contract` proves service catalog create, edit, list and deactivate in the authenticated tenant. | 04-01 |
| STK-02 | `stock-contract` proves product category and product creation with tenant-owned relationships. | 04-01 |
| STK-03 | `stock-contract` proves supplier create, edit, list and deactivate or inactive management behavior. | 04-01 |
| STK-04 | `stock-contract` proves purchase registration with at least one purchase item. | 04-02 |
| STK-05 | `stock-contract` proves purchase entry increases physical stock and writes entry movement in one transaction. | 04-02 |
| STK-06 | `stock-contract` proves authorized stock exit requires origin tracking and reduces physical stock transactionally. | 04-02 |
| STK-07 | `stock-contract` proves authorized stock adjustment requires reason and writes audit evidence. | 04-02 |
| STK-08 | `stock-contract` and `stock-ui` prove product minimum stock can be configured and displayed. | 04-01, 04-04 |
| STK-09 | `stock-contract` and `stock-ui` prove low-stock state is calculated from current stock data and rendered as visual state only. | 04-01, 04-04 |
| STK-10 | `stock-contract` proves reservation changes reserved and available quantities without changing physical stock. | 04-03 |
| STK-11 | `stock-contract` proves reservation cancellation restores availability and prevents double cancellation corruption. | 04-03 |
| STK-12 | `stock-contract` proves movement history exposes movement type, source operation and balance-after values. | 04-02, 04-03 |
| STK-13 | `stock-concurrency` proves concurrent stock writes cannot produce negative or incorrect physical/reserved/available balances. | 04-02, 04-03 |
| STK-14 | `stock-contract` proves catalog, supplier, stock, movement and reservation records cannot cross tenant boundaries. | 04-01, 04-02, 04-03 |

## Phase Gate

Phase 4 is complete only when all of these commands pass:

```bash
npm run db:migrate
npm run test -w apps/api -- stock-contract stock-concurrency prisma-baseline
npm run test -w apps/web -- stock-ui
npm run verify
```

If `npm run verify` fails, Phase 4 completion is blocked. The executor must fix the failure when it is Phase 4 related, or stop and route to a fix/debug decision with the failing command output when the failure is unrelated or predates Phase 4.

## Traceability Notes

- Plans 04-01 through 04-04 preserve coverage for STK-01 through STK-14.
- No validation path relies on visible screens or created files alone.
- Backend tests remain authoritative for tenant isolation, authorization, transactional integrity and concurrency.
- UI tests prove the approved Phase 4 UI contract without adding communication or notification surfaces.
