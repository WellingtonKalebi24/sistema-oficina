---
phase: 06-diagn-stico-e-or-amento
plan: 03
subsystem: api
tags: [prisma, express, quotes, pdfkit, vitest, tenant-isolation]
requires:
  - phase: 06-diagn-stico-e-or-amento
    provides: 06-02 draft quote API, backend totals, tenant-scoped quote items and quote permissions
provides:
  - Immutable published quote version snapshots.
  - New editable draft creation from the latest published version.
  - Published-only customer-facing PDF generation from persisted snapshots.
  - Published-only manual secure approval link creation with hash-only token persistence.
  - Manual Enviado and Cancelado status actions with sanitized audit.
affects: [phase-06, phase-07, quote-approval, quote-ui, work-order-conversion]
tech-stack:
  added: []
  patterns:
    - Published quote artifacts are generated from QuoteVersion snapshots, not mutable draft/catalog/customer rows.
    - Secure approval links return opaque tokens only in the authenticated response and persist only SHA-256 token hashes.
key-files:
  created:
    - apps/api/src/test/quote-versioning.test.ts
    - apps/api/src/test/quote-pdf.test.ts
    - apps/api/src/quotes/quotePdf.ts
    - prisma/migrations/20260728171000_add_quote_versions/migration.sql
  modified:
    - prisma/schema.prisma
    - apps/api/src/test/testData.ts
    - apps/api/src/quotes/quoteSchemas.ts
    - apps/api/src/quotes/quoteService.ts
    - apps/api/src/http/routes/quotes.ts
key-decisions:
  - "Published quote versions preserve persisted draft aggregate totals from 06-02 because the MVP draft schema stores aggregate quote-level adjustments, not separate quote-level adjustment components."
  - "Quote approval links use SHA-256 token hashes in storage and expose the plaintext token only as part of the authenticated manual-copy URL response."
patterns-established:
  - "PDF rendering accepts a QuoteVersion DTO only and excludes internal notes, product cost, margin, supplier, audit, permission and token/hash data."
  - "Manual Enviado is a status/audit transition only; no mail, WhatsApp, SMS, push, notification, delivery or read-tracking behavior is introduced."
requirements-completed: [QTE-03, QTE-04, QTE-05, QTE-06, QTE-07, QTE-08, QTE-09, QTE-10, QTE-11]
coverage:
  - id: D1
    description: Operators can publish immutable quote versions that preserve commercial snapshot data.
    requirement: QTE-08
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- quote-versioning quote-pdf quote-contract"
        status: pass
    human_judgment: false
  - id: D2
    description: Operators can create a new editable draft from the latest published version without mutating prior versions.
    requirement: QTE-09
    verification:
      - kind: integration
        ref: "apps/api/src/test/quote-versioning.test.ts#QTE-08/D-11/D-13 publishes an immutable version"
        status: pass
    human_judgment: false
  - id: D3
    description: Operators can generate customer-facing PDFs only for published quote version snapshots.
    requirement: QTE-10
    verification:
      - kind: integration
        ref: "apps/api/src/test/quote-pdf.test.ts#QTE-10/D-18/D-19/D-22 streams customer-facing PDF content"
        status: pass
    human_judgment: false
  - id: D4
    description: Operators can manually copy secure approval links for published versions with hash-only token persistence.
    requirement: QTE-11
    verification:
      - kind: integration
        ref: "apps/api/src/test/quote-versioning.test.ts#QTE-11/D-17 creates manual links"
        status: pass
    human_judgment: false
  - id: D5
    description: Manual Enviado status changes are audited without automatic communication side effects.
    requirement: QTE-11
    verification:
      - kind: integration
        ref: "apps/api/src/test/quote-versioning.test.ts#QTE-11/D-17 creates manual links"
        status: pass
    human_judgment: false
duration: 14 min
completed: 2026-07-28
status: complete
---

# Phase 06 Plan 03: Quote Publication Artifacts Summary

**Immutable quote versions now back published-only PDF and manual secure-link actions from persisted customer-facing snapshots.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-28T21:10:33Z
- **Completed:** 2026-07-28T21:24:25Z
- **Tasks:** 3 completed
- **Files modified:** 9

## Accomplishments

- Added RED API tests for immutable publication, new-version drafts, published-only PDF/link behavior, manual Enviado status and no communication side effects.
- Added `QuoteVersion`, `QuoteVersionItem` and `QuoteApprovalLink` schema/migration support with snapshot fields and hash-only token storage.
- Implemented transactional quote publication, new editable drafts from latest published snapshots, published-version reads, PDF generation, manual approval link creation, manual sent status and cancel status routes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RED versioning and PDF/link contracts** - `6e29afc` (test)
2. **Task 2: Add immutable version schema and migrate** - `ef07f9e` (feat)
3. **Task 3: Implement publish, new-version, PDF and manual link routes** - `e300ec1` (feat)

**Plan metadata:** committed separately after state/roadmap updates.

## Files Created/Modified

- `apps/api/src/test/quote-versioning.test.ts` - Integration contracts for immutable publication, new-version copy, secure link and manual sent behavior.
- `apps/api/src/test/quote-pdf.test.ts` - Integration contract for published-only customer-facing PDF content and internal-data exclusions.
- `apps/api/src/test/testData.ts` - Cleanup order updated for `quoteApprovalLink`, version items and versions.
- `prisma/schema.prisma` - Adds version/link models and `Quote.currentVersionId`.
- `prisma/migrations/20260728171000_add_quote_versions/migration.sql` - Creates version, version item and approval link tables plus constraints/indexes.
- `apps/api/src/quotes/quoteSchemas.ts` - Adds approval-link request validation.
- `apps/api/src/quotes/quoteService.ts` - Implements publication, new-version, published DTO, secure-link and manual status service functions.
- `apps/api/src/quotes/quotePdf.ts` - Renders customer-facing PDFs from published snapshots only.
- `apps/api/src/http/routes/quotes.ts` - Adds permissioned publish, new-version, version read, PDF, link, sent and cancel routes.

## Decisions Made

- Preserved persisted draft aggregate totals in published snapshots because 06-02 stores quote-level adjustments only as aggregate persisted values.
- Kept approval link creation internal/authenticated in Phase 6; public token validation and approval remain Phase 7.
- Rendered PDF bytes on demand from `QuoteVersion` rows only, avoiding mutable customer/catalog/product drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing Prisma opposite relation for version item service references**
- **Found during:** Task 2
- **Issue:** Prisma validation failed because `QuoteVersionItem.serviceCatalogEntry` lacked the opposite relation field.
- **Fix:** Added `ServiceCatalogEntry.quoteVersionItems`.
- **Files modified:** `prisma/schema.prisma`
- **Verification:** `npm run db:migrate` passed.
- **Committed in:** `ef07f9e`

**2. [Rule 1 - Bug] Preserved persisted aggregate totals during publication**
- **Found during:** Task 3
- **Issue:** Publication recalculated version totals from item rows only, dropping 06-02 quote-level aggregate adjustments.
- **Fix:** Version snapshots now store the draft quote's persisted aggregate totals while version items preserve item snapshot totals.
- **Files modified:** `apps/api/src/quotes/quoteService.ts`
- **Verification:** `npm run test -w apps/api -- quote-versioning quote-pdf quote-contract` passed.
- **Committed in:** `e300ec1`

---

**Total deviations:** 2 auto-fixed (2 bugs).
**Impact on plan:** Both fixes preserved the planned schema and immutability guarantees without expanding scope.

## Issues Encountered

- Task 2 schema verification passed with `npm run db:migrate` and `prisma-baseline`; quote-versioning/PDF tests remained RED until Task 3 because route behavior was intentionally not implemented yet.
- API integration tests still emit the existing pg adapter deprecation warning about nested client queries; it does not fail the suite.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm run db:migrate` passed.
- `npm run test -w apps/api -- quote-versioning quote-pdf quote-contract` passed.
- `npm run typecheck -w apps/api` passed.
- `npm run lint -w apps/api` passed.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: authenticated-api | `apps/api/src/http/routes/quotes.ts` | Adds authenticated publish, new-version, version read, PDF, link and manual status routes. |
| threat_flag: token-storage | `prisma/schema.prisma` | Adds quote approval link metadata with persisted token hash and no plaintext token field. |
| threat_flag: customer-facing-pdf | `apps/api/src/quotes/quotePdf.ts` | Streams customer-facing PDF bytes generated from published snapshots. |

## Next Phase Readiness

Ready for `06-04`: the API now exposes immutable published version DTOs, PDF generation and manual copy-link actions for the authenticated quote UI.

## Self-Check: PASSED

- Found `apps/api/src/test/quote-versioning.test.ts`.
- Found `apps/api/src/test/quote-pdf.test.ts`.
- Found `prisma/migrations/20260728171000_add_quote_versions/migration.sql`.
- Found `apps/api/src/quotes/quotePdf.ts`.
- Found task commits `6e29afc`, `ef07f9e` and `e300ec1` in git history.
- No known stubs found in files created or modified by this plan.
- All plan-level verification commands passed.

---
*Phase: 06-diagn-stico-e-or-amento*
*Completed: 2026-07-28*
