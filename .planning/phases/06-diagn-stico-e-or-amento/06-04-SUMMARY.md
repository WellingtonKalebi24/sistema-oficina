---
phase: 06-diagn-stico-e-or-amento
plan: 04
subsystem: ui
tags: [react, vite, typescript, quotes, pdf, manual-delivery]
requires:
  - phase: 06-diagn-stico-e-or-amento
    provides: 06-03 immutable quote versions, published PDF route and manual secure-link route
provides:
  - Authenticated Orcamentos navigation and compact quote workspace.
  - Typed web quote API client with JSON helpers and authenticated PDF blob helper.
  - UI coverage for draft creation, editing, warning-only discounts, publication, versioning, PDF and manual link copy.
  - Responsive table-first quote workspace styles and Phase 6 roadmap completion.
affects: [phase-06, phase-07, quote-approval, work-order-conversion, ui-verification]
tech-stack:
  added: []
  patterns:
    - Quote UI loads data only when quotes.read is present while preserving backend 403 blocked states.
    - Published quote actions use backend version/link/PDF routes and never construct customer-facing PDF content from mutable browser state.
key-files:
  created:
    - apps/web/src/api/quotes.ts
    - apps/web/src/test/quote-ui.test.tsx
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/styles.css
    - apps/api/src/quotes/quoteService.ts
    - apps/api/src/quotes/quoteCalculator.ts
    - apps/api/src/quotes/quotePdf.ts
    - apps/api/src/test/quote-versioning.test.ts
    - .planning/ROADMAP.md
key-decisions:
  - "The Orcamentos screen remains a compact operational workspace using local manual UI primitives, not shadcn/Radix."
  - "Manual delivery actions copy/open backend-generated artifacts only after publication and never claim external delivery or read status."
  - "Quote list serialization now includes currentVersionId so the authenticated UI can call existing version-scoped PDF/link routes safely."
patterns-established:
  - "Frontend quote writes refresh /quotes after each mutation so API-calculated totals and backend status remain authoritative."
  - "Published commercial fields are disabled in the UI and changes require Criar nova versao."
requirements-completed: [QTE-01, QTE-02, QTE-03, QTE-04, QTE-05, QTE-06, QTE-07, QTE-08, QTE-09, QTE-10, QTE-11]
coverage:
  - id: D1
    description: Authenticated operators with quotes.read see Orcamentos and sessions without it do not load quote data.
    requirement: QTE-01
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/quote-ui.test.tsx#QTE-01 exposes Orcamentos navigation only for quotes.read sessions"
        status: pass
      - kind: other
        ref: "npm run test -w apps/web -- quote-ui"
        status: pass
    human_judgment: false
  - id: D2
    description: Operators can create quotes from check-ins or direct customer/vehicle context, edit diagnosis/items, and see BRL totals with warning-only discount handling.
    requirement: QTE-05
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/quote-ui.test.tsx#QTE-01 through QTE-11 manages check-in and direct quote creation"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- quote-calculator quote-contract quote-versioning quote-pdf"
        status: pass
    human_judgment: false
  - id: D3
    description: Published commercial fields become read-only and expose Criar nova versao, Copiar link, Imprimir/Gerar PDF and Marcar como enviado only after publication.
    requirement: QTE-08
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/quote-ui.test.tsx#QTE-08/QTE-11 exposes published-only manual link, PDF, new-version and sent actions"
        status: pass
    human_judgment: false
  - id: D4
    description: Backend 403 remains visible as Acesso bloqueado pela permissao do servidor.
    requirement: QTE-11
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/quote-ui.test.tsx#renders backend 403 as the authoritative quote blocked state"
        status: pass
    human_judgment: false
  - id: D5
    description: Responsive quote workspace follows the Phase 6 UI contract without automatic communication controls.
    requirement: QTE-11
    verification:
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: true
    rationale: "Visual fit and responsive ergonomics still require human UAT despite automated copy/behavior coverage."
duration: 22 min
completed: 2026-07-28
status: complete
---

# Phase 06 Plan 04: Authenticated Quote UI Summary

**Authenticated Orcamentos workspace now creates, edits, publishes, versions, prints and manually shares quote artifacts through backend-authoritative APIs.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-28T21:28:53Z
- **Completed:** 2026-07-28T21:50:25Z
- **Tasks:** 3 completed
- **Files modified:** 9

## Accomplishments

- Added RED quote UI contract tests for navigation, check-in/direct creation, item grouping, BRL totals, warning-only discounts, published locks, manual link/PDF actions and communication prohibitions.
- Added `apps/web/src/api/quotes.ts` with typed JSON helpers and an authenticated PDF `Blob` helper for all Phase 6 quote routes.
- Integrated `Orcamentos` into the authenticated app shell with permission-gated loading, backend 403 blocked state, quote write/publish/version/link/PDF/status handlers and the compact `QuotesPanel`.
- Added responsive quote workspace CSS using existing operational panels, tables, callouts, pills, confirmation strips and mobile stacked controls.
- Updated the Phase 6 roadmap plan list to show all four plans executed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED quote UI contract tests** - `2c770cf` (test)
2. **Task 2: Implement quote web client and authenticated workspace** - `e878a78` (feat)
3. **Task 3: Apply quote UI styles, update roadmap plan list and run final phase verification** - `f5b2ff8` (style)

## Files Created/Modified

- `apps/web/src/api/quotes.ts` - Typed quote API client for JSON routes, manual secure link creation and authenticated PDF blob fetches.
- `apps/web/src/App.tsx` - Adds quote state, loaders, handlers, navigation and the authenticated `QuotesPanel`.
- `apps/web/src/styles.css` - Adds quote-specific responsive workspace, table, item group, summary and warning/manual guard styles.
- `apps/web/src/test/quote-ui.test.tsx` - UI behavior tests for QTE-01 through QTE-11.
- `apps/api/src/quotes/quoteService.ts` - Serializes `currentVersionId` for version-scoped published artifact actions.
- `apps/api/src/quotes/quoteCalculator.ts` - Prettier formatting required by full verification.
- `apps/api/src/quotes/quotePdf.ts` - Prettier formatting required by full verification.
- `apps/api/src/test/quote-versioning.test.ts` - Prettier formatting required by full verification.
- `.planning/ROADMAP.md` - Marks Phase 6 plan count/list at 4/4 executed.

## Decisions Made

- Kept the UI on the local manual component system and existing Font Awesome/navigation patterns.
- Kept link and PDF controls unavailable until the backend reports a published `currentVersionId`.
- Copied only the backend approval URL string to the clipboard and opened only the authenticated backend PDF blob.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added currentVersionId to quote serialization**
- **Found during:** Task 2
- **Issue:** Published quote UI actions need the version id for `/quotes/:quoteId/versions/:versionId/link` and `/pdf`, but quote list serialization did not expose it.
- **Fix:** Added `currentVersionId` to `serializeQuote`.
- **Files modified:** `apps/api/src/quotes/quoteService.ts`
- **Verification:** `npm run typecheck -w apps/api`, `npm run test -w apps/api -- quote-calculator quote-contract quote-versioning quote-pdf`, and `npm run verify` passed.
- **Committed in:** `e878a78`

**2. [Rule 3 - Blocking] Formatted quote files required by full verification**
- **Found during:** Task 3
- **Issue:** `npm run verify` failed at `format:check` on quote files from Phase 6.
- **Fix:** Ran Prettier on quote API/web files only, then reran full verification.
- **Files modified:** `apps/api/src/quotes/quoteCalculator.ts`, `apps/api/src/quotes/quotePdf.ts`, `apps/api/src/quotes/quoteService.ts`, `apps/api/src/test/quote-versioning.test.ts`, `apps/web/src/api/quotes.ts`, `apps/web/src/App.tsx`, `apps/web/src/test/quote-ui.test.tsx`
- **Verification:** `npm run verify` passed.
- **Committed in:** `f5b2ff8`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking).
**Impact on plan:** Both fixes were required for correct UI operation and completion-quality verification; no architecture or scope expansion.

## Issues Encountered

- `npm run db:migrate` initially failed because this shell had no `DATABASE_URL`; reran with `postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public`, matching `.env.example`, and migration reported already in sync.
- API integration tests continue to emit the existing pg adapter deprecation warning about nested client queries; it does not fail the suite.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm run test -w apps/web -- quote-ui` passed.
- `npm run typecheck -w apps/web` passed.
- `npm run typecheck -w apps/api` passed.
- `npm run test -w apps/api -- quote-calculator quote-contract quote-versioning quote-pdf` passed.
- `npm run db:migrate` passed with `DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public`.
- `npm run verify` passed with `DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public`.

## Known Stubs

None. Placeholder attributes found in App inputs are operational input hints, not unwired data stubs.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: browser-to-api | `apps/web/src/api/quotes.ts` | New authenticated web client surface for quote JSON, secure-link and PDF blob routes. |
| threat_flag: browser-local-api | `apps/web/src/App.tsx` | Clipboard and object URL APIs are used for manual link/PDF actions after publication only. |

## Next Phase Readiness

Phase 6 is complete. Phase 7 can build the public approval page on top of the immutable quote version and secure approval-link primitives without introducing automatic communications.

## Self-Check: PASSED

- Found `apps/web/src/api/quotes.ts`.
- Found `apps/web/src/test/quote-ui.test.tsx`.
- Found `.planning/phases/06-diagn-stico-e-or-amento/06-04-SUMMARY.md`.
- Found task commits `2c770cf`, `e878a78` and `f5b2ff8` in git history.
- All plan-level verification commands passed.

---
*Phase: 06-diagn-stico-e-or-amento*
*Completed: 2026-07-28*
