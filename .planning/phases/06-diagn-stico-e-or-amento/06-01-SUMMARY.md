---
phase: 06-diagn-stico-e-or-amento
plan: 01
subsystem: database
tags: [prisma, postgres, permissions, quotes, pdfkit]
requires:
  - phase: 03-clientes-e-ve-culos
    provides: tenant-scoped customer and vehicle anchors
  - phase: 04-servi-os-produtos-compras-e-estoque
    provides: service and product catalog anchors
  - phase: 05-agenda-e-recep-o
    provides: reception check-in anchors
provides:
  - Tenant-scoped draft quote and quote item persistence.
  - Company discount warning setting for quote totals.
  - Quote permission catalog keys for later backend route gates.
  - Approved PDFKit package metadata for server-rendered quote PDFs.
affects: [phase-06, phase-07, phase-08, quote-api, quote-pdf]
tech-stack:
  added: [pdfkit, "@types/pdfkit"]
  patterns:
    - Tenant-scoped operational tables use tenant_id plus tenant/status and relation indexes.
    - Quote permissions derive through ALL_PERMISSIONS for deterministic seed/admin fixture wiring.
key-files:
  created:
    - prisma/migrations/20260728170000_add_quotes/migration.sql
  modified:
    - apps/api/package.json
    - package-lock.json
    - prisma/schema.prisma
    - apps/api/src/permissions/permissions.ts
    - apps/api/src/test/prisma-baseline.test.ts
    - apps/api/src/test/testData.ts
key-decisions:
  - "Phase 6 stores quote status as text with the agreed values Rascunho, Publicado, Enviado, Expirado and Cancelado, guarded by migration check constraints."
  - "Discount limit handling starts as warning metadata, not a blocking permission rule, matching D-08."
patterns-established:
  - "Quote foundation tables carry tenantId and indexed relations to customer, vehicle, optional check-in, service catalog entry and product."
  - "Future quote version/link cleanup delegates are optional in testData so later migrations can add those tables without breaking current tests."
requirements-completed: [QTE-01, QTE-02, QTE-03, QTE-04, QTE-05, QTE-06, QTE-07]
coverage:
  - id: D1
    description: Approved PDFKit runtime and type packages are installed for API quote PDF generation.
    requirement: QTE-10
    verification:
      - kind: other
        ref: "npm install -w apps/api pdfkit && npm install -D -w apps/api @types/pdfkit"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- permissions"
        status: pass
    human_judgment: false
  - id: D2
    description: Quote read/write/publish/pdf/link/status permissions are available through the existing catalog and seed flow.
    requirement: QTE-01
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- permissions"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
    human_judgment: false
  - id: D3
    description: Tenant-scoped Quote and QuoteItem schema persists draft diagnosis, items, totals, validity, deadline and warning metadata.
    requirement: QTE-01
    verification:
      - kind: integration
        ref: "npm run db:migrate"
        status: pass
      - kind: integration
        ref: "npm run test -w apps/api -- prisma-baseline"
        status: pass
    human_judgment: false
  - id: D4
    description: Test cleanup supports quote tables before dependent reception/customer/vehicle/catalog rows.
    requirement: QTE-03
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- prisma-baseline"
        status: pass
    human_judgment: false
duration: 7 min
completed: 2026-07-28
status: complete
---

# Phase 06 Plan 01: Quote Foundation Summary

**Tenant-scoped quote draft schema, discount warning setting, PDFKit dependency, and quote permissions are ready for the Phase 6 API work.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-28T20:39:04Z
- **Completed:** 2026-07-28T20:46:25Z
- **Tasks:** 2 completed
- **Files modified:** 7

## Accomplishments

- Installed only the approved `pdfkit` and `@types/pdfkit` packages for later backend PDF rendering.
- Added quote read/write/publish/pdf/link/status permission keys to the existing permission catalog consumed by seed and test fixtures.
- Added `CompanySetting.quoteDiscountWarningPercent` with default `10.00`.
- Added tenant-scoped `Quote` and `QuoteItem` models plus a runnable PostgreSQL migration with source/status/item check constraints.
- Updated API test cleanup and Prisma baseline coverage for the new quote foundation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install approved PDF dependency and add quote permissions** - `19c060b` (feat)
2. **Task 2: Add draft quote schema, migration and cleanup support** - `3ef7375` (feat)

## Files Created/Modified

- `apps/api/package.json` - Adds `pdfkit` and `@types/pdfkit` to the API workspace.
- `package-lock.json` - Records approved PDF dependency tree.
- `apps/api/src/permissions/permissions.ts` - Adds quote permission keys and descriptions.
- `prisma/schema.prisma` - Adds quote discount setting and draft quote persistence models.
- `prisma/migrations/20260728170000_add_quotes/migration.sql` - Creates quote tables and setting column.
- `apps/api/src/test/prisma-baseline.test.ts` - Updates schema baseline expectations for Phase 6.
- `apps/api/src/test/testData.ts` - Cleans quote-related tables before dependent operational tables.

## Decisions Made

- Stored Phase 6 quote status values as text with database check constraints, matching the existing project pattern for operational statuses.
- Kept discount above limit as persisted warning metadata, not a blocking permission rule, per D-08.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion.

## Issues Encountered

- `prisma format` required `DATABASE_URL` because the local Prisma config resolves environment variables during schema loading; reran with the dev database URL.
- npm reported 5 existing audit findings after the approved package install. No package substitution or audit fix was applied because the plan allowed only the audited package names.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm install -w apps/api pdfkit` passed.
- `npm install -D -w apps/api @types/pdfkit` passed.
- `npm run db:migrate` passed and later reported the database already in sync.
- `npm run test -w apps/api -- prisma-baseline` passed.
- `npm run test -w apps/api -- permissions` passed.
- `npm run typecheck -w apps/api` passed.
- `npm run lint -w apps/api` passed.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: schema-trust-boundary | `prisma/schema.prisma` | New tenant-scoped quote persistence surface for later authenticated API routes. |
| threat_flag: dependency-surface | `apps/api/package.json` | New server-side PDF rendering dependency approved by the Phase 6 package audit. |

## Next Phase Readiness

Ready for `06-02`: draft quote APIs can now rely on stable tenant-scoped persistence, quote permissions, discount warning settings and cleanup support.

## Self-Check: PASSED

- Found `prisma/migrations/20260728170000_add_quotes/migration.sql`.
- Found task commits `19c060b` and `3ef7375` in git history.
- All plan-level verification commands passed.

---
*Phase: 06-diagn-stico-e-or-amento*
*Completed: 2026-07-28*
