# Phase 6: Diagnostico e Orcamento - Research

**Researched:** 2026-07-28
**Domain:** Tenant-scoped diagnosis, quote versioning, commercial totals, PDF/link artifact generation
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Phase 6 delivers the internal diagnosis and quote workflow for the workshop: diagnosis records, draft quotes, service/product items, totals, discount/surcharge handling, immutable published versions, new versions, PDF generation, and secure link copy/print delivery. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]

- D-01: Quote creation must support two entry points: from an existing reception check-in or directly from tenant-scoped customer/vehicle data. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-02: If a quote starts from a check-in, diagnosis is required before publishing the quote version. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-03: If a quote starts directly from customer/vehicle data, diagnosis text is optional so the workshop can create a simpler commercial quote. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-04: Diagnosis stores `problema`, `causa` and `recomendacao`. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-05: Any user with quote permission can fill or update diagnosis data; a separate diagnosis-only permission is not required for this phase. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-06: Quote items are modeled as a single list, but the UI and PDF should group them visually by services and products/parts. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-07: Discounts and surcharges can be applied both per item and to the quote total. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-08: Discount above the configured limit should show a warning only, not block saving or publishing, overriding QTE-06's original blocking-permission wording. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-09: Quote validity date is required before publication. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-10: Estimated delivery deadline is optional. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-11: A quote becomes a published version only through an explicit `Publicar versao` action. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-12: Draft quotes remain editable until publication. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-13: Published commercial data is immutable. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-14: Non-commercial/administrative fields may be adjusted after publication when permitted and audited. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-15: Creating a new version copies the previously published version as the starting point. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-16: Phase 6 quote statuses are `Rascunho`, `Publicado`, `Enviado`, `Expirado` and `Cancelado`. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-17: `Enviado` is only a manual operational mark and must not send messages, open WhatsApp/email automatically, or record delivery/read status. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-18: The customer-facing PDF includes workshop data, customer, vehicle, quote validity, grouped service/product items, totals, customer-facing observations and diagnosis summary when present. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-19: The PDF may include diagnosis problem, cause and recommendation, but must not expose internal observations. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-20: PDF generation and secure link copy are available only after the quote version is published. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-21: The UI should provide `Copiar link` and `Imprimir/Gerar PDF` actions; delivery happens outside the system. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- D-22: Customer-facing PDF/link must not show internal costs, margin, supplier data or internal notes. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]

### the agent's Discretion
- The planner may choose exact Prisma model names, route names, permission key names, PDF rendering library and UI component decomposition if they preserve tenant isolation, backend authorization, auditability, immutable published versions and the no-automatic-communications boundary. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- The planner may decide how to store generated PDF metadata versus rendering on demand, as long as the PDF cannot diverge from the persisted published quote version. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
Public quote viewing, customer decisions, approval/refusal capture, work-order conversion, finance, automatic WhatsApp/email/SMS/push sending, notification records, and delivery/read tracking are out of scope for Phase 6. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QTE-01 | User can create a diagnosis for a checked-in or registered vehicle. [VERIFIED: .planning/REQUIREMENTS.md] | Use quote-owned diagnosis fields linked to tenant/customer/vehicle and optionally check-in. [VERIFIED: codebase grep] |
| QTE-02 | User can add recommended services and parts to a diagnosis. [VERIFIED: .planning/REQUIREMENTS.md] | Snapshot service/product recommendations from existing catalog rows under tenant scope. [VERIFIED: prisma/schema.prisma] |
| QTE-03 | User can create a quote from diagnosis data. [VERIFIED: .planning/REQUIREMENTS.md] | Create draft quote from diagnosis/check-in or direct customer/vehicle flow. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| QTE-04 | User can add service and product items to a quote. [VERIFIED: .planning/REQUIREMENTS.md] | Store one item table with type discriminator and visual grouping. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| QTE-05 | System calculates quote subtotal, discounts, surcharges and total correctly. [VERIFIED: .planning/REQUIREMENTS.md] | Calculate on backend using integer cents or Prisma decimals, with UI mirroring only. [ASSUMED] |
| QTE-06 | Discount above configured limits requires permission. [VERIFIED: .planning/REQUIREMENTS.md] | Phase context overrides this to warning-only; audit the warning and do not block save/publish. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| QTE-07 | User can define quote validity and estimated delivery deadline. [VERIFIED: .planning/REQUIREMENTS.md] | Require validity before publish; keep deadline nullable. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| QTE-08 | User can publish a quote version that preserves commercial data immutably. [VERIFIED: .planning/REQUIREMENTS.md] | Publish by creating immutable version rows/snapshots in a transaction. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions] |
| QTE-09 | User can create a new quote version without altering prior versions. [VERIFIED: .planning/REQUIREMENTS.md] | Copy the latest published version into a new editable draft or draft-version workspace. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| QTE-10 | User can generate and inspect a PDF for a quote version. [VERIFIED: .planning/REQUIREMENTS.md] | Stream PDFKit output from server using published-version data only. [CITED: https://pdfkit.org/docs/getting_started.html] |
| QTE-11 | User can print or manually copy a secure approval link for a quote version. [VERIFIED: .planning/REQUIREMENTS.md] | Generate/copy link only after publication and do not implement public approval behavior in Phase 6. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
</phase_requirements>

## Summary

Phase 6 should be planned as a backend-authoritative commercial workflow: the API owns tenant checks, permission checks, totals, version publication, immutable snapshots, audit rows, PDF/link eligibility, and the no-automatic-communications boundary. [VERIFIED: AGENTS.md] The web app should provide the compact operational quote workspace described by the UI spec, but frontend hiding or warnings are not substitutes for backend validation. [VERIFIED: AGENTS.md]

The highest-risk design decision is quote version modeling. [VERIFIED: .planning/STATE.md] Use mutable draft data until explicit publication, then copy all customer-facing commercial facts into immutable published-version rows; do not render PDF or link from current catalog/customer/product rows. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]

**Primary recommendation:** Build `quotes` plus `quote_versions`/`quote_version_items` snapshots, publish through a single Prisma transaction, and render PDF/link from the published snapshot only. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]

## Project Constraints (from AGENTS.md)

- Keep React/Vite/TypeScript, Node.js/Express/TypeScript, PostgreSQL, Prisma and Docker Compose unless a technical decision records a change. [VERIFIED: AGENTS.md]
- Enforce authorization in the backend; frontend controls are usability only. [VERIFIED: AGENTS.md]
- Filter and validate all operational records by the authenticated tenant. [VERIFIED: AGENTS.md]
- Do not send messages, open WhatsApp automatically, or record delivery/read communication events. [VERIFIED: AGENTS.md]
- Use transactions for stock, quote, work-order and finance integrity. [VERIFIED: AGENTS.md]
- Audit critical actions with tenant, user, action, entity, record, timestamp and relevant values, without secrets. [VERIFIED: AGENTS.md]
- Do not conclude phases with failing lint, typecheck, tests, migrations or critical validation. [VERIFIED: AGENTS.md]
- Verification must be executable; files/screens/endpoints alone do not prove completion. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Diagnosis capture | API / Backend | Browser / Client | Backend validates tenant/customer/vehicle/check-in links; client edits compact fields. [VERIFIED: codebase grep] |
| Quote draft editing | API / Backend | Browser / Client | Backend persists authoritative draft state and tenant scope; client mirrors calculations for operator feedback. [VERIFIED: AGENTS.md] |
| Totals/discount warnings | API / Backend | Browser / Client | Backend owns persisted totals and warning flags; UI recalculates immediately but is not authoritative. [VERIFIED: AGENTS.md] |
| Publish immutable version | API / Backend | Database / Storage | Backend transaction creates snapshot rows; database constraints should prevent mutable published commercial rows. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions] |
| PDF generation | API / Backend | Browser / Client | Server renders from version snapshot; browser opens/downloads/prints returned PDF. [CITED: https://pdfkit.org/docs/getting_started.html] |
| Secure link copy | API / Backend | Browser / Client | Backend creates token/link only for published version; client copies string manually. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| Stock reservation integration | API / Backend | Database / Storage | Existing stock service reserves quantity transactionally without changing physical stock. [VERIFIED: apps/api/src/stock/stockService.ts] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | 7.8.0; npm modified 2026-07-28 | Tenant-scoped persistence, transactions and snapshots | Existing ORM and migration source for the project. [VERIFIED: package.json+npm registry] |
| `express` | 5.2.1; npm modified 2026-07-14 | Authenticated quote/PDF routes | Existing API framework and response API supports attachment headers. [VERIFIED: package.json+npm registry] [CITED: https://expressjs.com/en/5x/api/response/] |
| `zod` | 4.4.3; npm modified 2026-05-04 | Request validation for IDs, enums, dates, quantities and monetary inputs | Existing validation stack with finite number and enum validators. [VERIFIED: package.json+npm registry] [CITED: https://zod.dev/api] |
| `pdfkit` | 0.19.1; npm modified 2026-06-10 | Server-side customer-facing quote PDF rendering | Official docs support Node streams and piping to HTTP response. [VERIFIED: npm registry] [CITED: https://pdfkit.org/docs/getting_started.html] |
| `react` | 19.2.7; npm modified 2026-07-27 | Quote workspace UI | Existing frontend runtime. [VERIFIED: package.json+npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/pdfkit` | 0.17.6; npm modified 2026-04-16 | Type declarations for PDFKit | Use if TypeScript build needs PDFKit declarations. [VERIFIED: npm registry] |
| `vitest` | 4.1.10; npm modified 2026-07-24 | API and web tests | Existing test runner for backend contracts and UI tests. [VERIFIED: package.json+npm registry] |
| `vite` | 8.1.4; npm modified 2026-07-22 | React development/build | Existing web build tool. [VERIFIED: package.json+npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pdfkit` | Browser print-only HTML | Easier package footprint but weak persistence guarantees; PDF could diverge from backend snapshot unless server owns rendering. [ASSUMED] |
| `pdfkit` | `@react-pdf/renderer` | Good for React-style documents, but adds a larger separate rendering model and is not already used. [ASSUMED] |

**Installation:**
```bash
npm install -w apps/api pdfkit
npm install -D -w apps/api @types/pdfkit
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `pdfkit` | npm | Created 2011-07-11; modified 2026-06-10 | 5,447,421/week | github.com/foliojs/pdfkit | OK | Approved. [VERIFIED: npm registry] |
| `@types/pdfkit` | npm | Created 2016-05-17; modified 2026-04-16 | 4,055,733/week | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved if declarations are needed. [VERIFIED: npm registry] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy seam]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
Authenticated operator
  -> React Orcamentos view
  -> Express /quotes routes with requireAuth + requirePermission
  -> Zod request validation
  -> Tenant scope validation for customer, vehicle, check-in, service and product IDs
  -> Quote service transaction
      -> Draft quote + diagnosis writes
      -> Item snapshots from service/product catalog
      -> Backend totals calculation
      -> Discount warning flag/audit metadata
      -> Publish action creates immutable quote_version + version_items
      -> Optional stock reservation sourceKind="quote"
  -> Published version
      -> PDFKit render from snapshot -> Express PDF response
      -> Secure link string for manual copy
      -> Manual Enviado status only; no communication side effects
```

### Recommended Project Structure

```text
apps/api/src/quotes/
  quoteSchemas.ts        # Zod inputs, status/type enums, money validation
  quoteCalculator.ts     # Pure subtotal/discount/surcharge/total calculations
  quoteService.ts        # Tenant-scoped draft, publish, version and status use cases
  quotePdf.ts            # PDFKit renderer from published snapshot DTO
apps/api/src/http/routes/
  quotes.ts              # Authenticated JSON routes and PDF route
apps/web/src/api/
  quotes.ts              # Typed client functions
apps/web/src/
  App.tsx                # Add Orcamentos shell integration
apps/api/src/test/
  quote-contract.test.ts # RED then green QTE contract coverage
  quote-versioning.test.ts
  quote-pdf.test.ts
apps/web/src/test/
  quote-ui.test.tsx
```

### Pattern 1: Publish by Snapshot Transaction
**What:** Create a version row and version item rows from the current draft inside one Prisma transaction, then mark current published version/status. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
**When to use:** `Publicar versao` and `Criar nova versao` actions. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
**Example:**
```typescript
// Source: Prisma transaction docs + existing stock transaction style
return prisma.$transaction(async (tx) => {
  const draft = await requireTenantDraftQuote(tx, actor.tenantId, quoteId);
  const totals = calculateQuoteTotals(draft.items, draft.adjustments);
  const version = await tx.quoteVersion.create({ data: snapshotVersion(draft, totals) });
  await tx.quoteVersionItem.createMany({ data: draft.items.map((item) => snapshotItem(version.id, item)) });
  await tx.quote.update({ where: { id: quoteId }, data: { status: "Publicado", currentVersionId: version.id } });
  await writeAuditLog(tx, { action: "quotes.version.published", entity: "quote", recordId: quoteId, tenantId: actor.tenantId, userId: actor.userId });
  return version;
});
```

### Pattern 2: Decimal Money Input, Deterministic Totals
**What:** Accept money as two-decimal strings or integer cents, normalize once, and calculate on backend. [VERIFIED: apps/api/src/stock/stockSchemas.ts]
**When to use:** Quote item prices, item-level discounts/surcharges, quote-level discounts/surcharges and totals. [VERIFIED: .planning/REQUIREMENTS.md]
**Example:**
```typescript
// Source: existing stock decimalString pattern
const moneyString = z.union([z.string().trim(), z.number().finite()]).transform((value) => {
  const text = typeof value === "number" ? value.toString() : value;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("Invalid decimal amount.");
  return Number(text).toFixed(2);
});
```

### Pattern 3: PDF From Published DTO Only
**What:** The PDF renderer accepts a published-version DTO, not a draft ID, catalog ID, or mutable quote model. [CITED: https://pdfkit.org/docs/getting_started.html]
**When to use:** `GET /quotes/:quoteId/versions/:versionId/pdf`. [ASSUMED]
**Example:**
```typescript
// Source: PDFKit docs
res.type("application/pdf");
res.attachment(`orcamento-${version.number}.pdf`);
const doc = new PDFDocument({ margin: 36, size: "A4" });
doc.pipe(res);
renderQuotePdf(doc, versionSnapshot);
doc.end();
```

### Anti-Patterns to Avoid
- **Mutating a published version:** breaks QTE-08/QTE-09 and makes approval/PDF history unreliable. [VERIFIED: .planning/REQUIREMENTS.md]
- **Rendering PDF from live product/service rows:** exposes drift after catalog edits. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- **Adding WhatsApp/email send buttons:** violates the project communication boundary. [VERIFIED: AGENTS.md]
- **Frontend-only discount enforcement:** contradicts backend-authoritative security and audit constraints. [VERIFIED: AGENTS.md]
- **Exposing product cost, margin, supplier or internal notes in PDF/link:** violates customer-facing artifact constraints. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF byte generation | Custom PDF syntax/string writer | `pdfkit` | PDF structure, pagination and streaming are non-trivial. [CITED: https://pdfkit.org/docs/getting_started.html] |
| Auth/permission checks | Route-local ad hoc checks | `requireAuth` + `requirePermission` middleware | Existing backend pattern centralizes authorization. [VERIFIED: apps/api/src/http/middleware/requirePermission.ts] |
| Tenant validation | Trust client tenant IDs | Existing tenant helpers plus `tenantId` filters | Existing helpers return 404/bad request for foreign records. [VERIFIED: apps/api/src/tenancy/tenantScope.ts] |
| Stock reservations | Directly increment product rows from quote code | Existing stock reservation service | It uses row locks and transaction-safe reserved quantity. [VERIFIED: apps/api/src/stock/stockService.ts] |
| Request validation | Manual `if` chains | Zod schemas | Existing API pattern uses parse/safeParse around route input. [VERIFIED: apps/api/src/http/routes/stockCatalog.ts] |

**Key insight:** Phase 6 is an immutability and audit problem more than a form problem; the database snapshot and backend transaction design determine whether later approval, work order and finance phases can trust quote history. [VERIFIED: .planning/STATE.md]

## Common Pitfalls

### Pitfall 1: Published Version Drift
**What goes wrong:** PDF/link shows current catalog/customer data instead of the exact published quote. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
**Why it happens:** Planner stores only foreign keys and recalculates later. [ASSUMED]
**How to avoid:** Store customer-facing snapshots and totals on `quote_versions` and `quote_version_items`. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
**Warning signs:** PDF test changes when product price changes after publication. [ASSUMED]

### Pitfall 2: Discount Rule Mismatch
**What goes wrong:** Implementation blocks above-limit discounts even though D-08 says warning-only. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
**Why it happens:** QTE-06 original wording conflicts with the phase decision. [VERIFIED: .planning/REQUIREMENTS.md]
**How to avoid:** Plan a warning flag/audit event instead of a hard permission gate. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
**Warning signs:** Tests assert 403 for above-limit discount. [ASSUMED]

### Pitfall 3: Communication Creep
**What goes wrong:** `Enviado` or link actions trigger WhatsApp/email or delivery/read records. [VERIFIED: AGENTS.md]
**Why it happens:** Quote workflows often conflate delivery status with sending. [ASSUMED]
**How to avoid:** `Enviado` is only manual status, and `Copiar link` only copies a URL. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
**Warning signs:** New notification/message tables, queues, email route calls or WhatsApp URLs. [VERIFIED: .planning/REQUIREMENTS.md]

### Pitfall 4: Monetary Floating-Point Errors
**What goes wrong:** Totals differ by cents between API, UI and PDF. [ASSUMED]
**Why it happens:** JavaScript floating-point arithmetic is used directly for currency totals. [ASSUMED]
**How to avoid:** Use decimal strings/Prisma Decimal or integer cents in calculation boundaries; test exact cents. [VERIFIED: apps/api/src/stock/stockSchemas.ts]
**Warning signs:** Tests use `toBeCloseTo` for money totals. [ASSUMED]

## Code Examples

### Backend Route Pattern
```typescript
// Source: apps/api/src/http/routes/stockMovements.ts
router.post(
  "/quotes/:quoteId/publish",
  requirePermission(prisma, PERMISSIONS.quotesPublish),
  asyncHandler(async (req, res) => {
    const version = await publishQuoteVersion(prisma, actorFromRequest(req), readPathId(req.params.quoteId));
    res.status(201).json({ data: serializeQuoteVersion(version) });
  }),
);
```

### PDF Streaming Pattern
```typescript
// Source: https://pdfkit.org/docs/getting_started.html and https://expressjs.com/en/5x/api/response/
res.type("application/pdf");
res.attachment(`orcamento-${version.publicNumber}.pdf`);
const doc = new PDFDocument({ margin: 36, size: "A4" });
doc.pipe(res);
renderCustomerFacingQuote(doc, version);
doc.end();
```

### Quote Item Snapshot Shape
```typescript
// Source: Phase 6 context; exact model names are planner discretion
type QuoteVersionItemSnapshot = {
  kind: "service" | "product";
  catalogReferenceId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  surchargeAmount: string;
  totalAmount: string;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Editable quote rows after publication | Immutable published version snapshots | Phase decision on 2026-07-28 | Plan publish/new-version as snapshot workflows. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| Blocking discount above limit | Warning-only discount above configured limit | Phase decision on 2026-07-28 | Plan audit/warning instead of permission block. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| Automated delivery actions | Manual copy/print and manual `Enviado` status | Project and phase boundary | Avoid send buttons, queues, notifications and tracking. [VERIFIED: AGENTS.md] |

**Deprecated/outdated:**
- Implementing QTE-06 as hard authorization is superseded for Phase 6 by D-08. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
- Browser-only PDF generation is not recommended because the artifact must be tied to persisted published data. [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Backend money should use integer cents or Prisma Decimal rather than raw JS float arithmetic. | Phase Requirements / Common Pitfalls | Cent-level totals may diverge between API, UI and PDF. |
| A2 | Browser print-only HTML is weaker than server PDF for this phase. | Alternatives / State of the Art | Planner might avoid `pdfkit` and need a stronger server-rendered HTML-to-PDF strategy. |
| A3 | `@react-pdf/renderer` is a larger rendering model than `pdfkit` for this codebase. | Alternatives | Planner could choose it if user prefers React document templates. |
| A4 | Warning signs listed for tests and implementation drift are inferred from standard failure modes. | Common Pitfalls | Planner should still create executable tests tailored to final route/model names. |

## Open Questions (RESOLVED)

1. **Discount limit source**
   What we know: D-08 says above-limit discounts warn only. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
   Resolution: Add `CompanySetting.quoteDiscountWarningPercent` as the tenant/company-level source for warning calculation, with an MVP default of `10.00`. Above-limit discounts create warning metadata and audit context only; they must not block save or publication. [DECIDED: plan-phase revision 2026-07-28]

2. **Secure link token implementation**
   What we know: Phase 6 copies a secure approval link but does not implement public viewing/approval. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]
   Resolution: Phase 6 stores an opaque random token hash and manual-link metadata for each published quote version, and returns/copies the URL string only after publication. Public token validation, public viewing and approval decisions remain Phase 7. [DECIDED: plan-phase revision 2026-07-28]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | API/web/tooling | yes | v22.14.0 | none needed. [VERIFIED: shell] |
| npm | Package install/scripts | yes | 10.9.2 | none needed. [VERIFIED: shell] |
| Docker | Local smoke runtime | yes | 29.6.1 | none needed. [VERIFIED: shell] |
| Docker Compose | Local app/db runtime | yes | v5.3.0 | none needed. [VERIFIED: shell] |
| Prisma CLI | Migrations | partial | package 7.8.0; CLI version command needs `DATABASE_URL` | Set env before Prisma commands. [VERIFIED: shell] |
| PostgreSQL | Integration tests/migrations | expected via Docker Compose | not probed as running | Start `docker compose up -d db`. [VERIFIED: compose.yaml] |

**Missing dependencies with no fallback:** none found for planning. [VERIFIED: shell]
**Missing dependencies with fallback:** Prisma version introspection needs `DATABASE_URL`; use package version metadata and configured env during execution. [VERIFIED: shell]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 for API and web. [VERIFIED: package.json+npm registry] |
| Config file | `apps/api/vitest.config.ts` serial API file execution; `apps/web/vite.config.ts` jsdom/globals. [VERIFIED: codebase grep] |
| Quick run command | `npm run test -w apps/api -- quote-contract` and `npm run test -w apps/web -- quote-ui`. [ASSUMED] |
| Full suite command | `npm run verify`. [VERIFIED: package.json] |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| QTE-01 | Diagnosis from check-in/direct customer vehicle | integration | `npm run test -w apps/api -- quote-contract` | no - Wave 0 |
| QTE-02 | Recommended services/products added | integration | `npm run test -w apps/api -- quote-contract` | no - Wave 0 |
| QTE-03 | Quote created from diagnosis | integration | `npm run test -w apps/api -- quote-contract` | no - Wave 0 |
| QTE-04 | Service/product quote items added | integration | `npm run test -w apps/api -- quote-contract` | no - Wave 0 |
| QTE-05 | Totals exact for subtotal, discounts, surcharges and total | unit + integration | `npm run test -w apps/api -- quote-calculator quote-contract` | no - Wave 0 |
| QTE-06 | Above-limit discount warning only | integration + UI | `npm run test -w apps/api -- quote-contract` | no - Wave 0 |
| QTE-07 | Validity required, deadline optional | integration + UI | `npm run test -w apps/api -- quote-contract` | no - Wave 0 |
| QTE-08 | Published version immutable | integration | `npm run test -w apps/api -- quote-versioning` | no - Wave 0 |
| QTE-09 | New version preserves prior version | integration | `npm run test -w apps/api -- quote-versioning` | no - Wave 0 |
| QTE-10 | PDF generated from version snapshot | integration | `npm run test -w apps/api -- quote-pdf` | no - Wave 0 |
| QTE-11 | Link copy/print actions only after publish | UI + integration | `npm run test -w apps/web -- quote-ui` | no - Wave 0 |

### Sampling Rate
- **Per task commit:** targeted API or web quote test plus touched workspace typecheck. [VERIFIED: AGENTS.md]
- **Per wave merge:** `npm run verify`. [VERIFIED: package.json]
- **Phase gate:** `npm run db:migrate`, targeted quote tests, and `npm run verify` green before verification. [VERIFIED: AGENTS.md]

### Wave 0 Gaps
- [ ] `apps/api/src/test/quote-contract.test.ts` covers QTE-01 through QTE-07. [ASSUMED]
- [ ] `apps/api/src/test/quote-versioning.test.ts` covers QTE-08 and QTE-09. [ASSUMED]
- [ ] `apps/api/src/test/quote-pdf.test.ts` covers QTE-10 and no internal data exposure. [ASSUMED]
- [ ] `apps/web/src/test/quote-ui.test.tsx` covers QTE-11 and UI gating states. [ASSUMED]
- [ ] Quote calculator unit tests cover exact money totals. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Existing `requireAuth` middleware protects internal quote routes. [VERIFIED: apps/api/src/app.ts] |
| V3 Session Management | yes | Existing JWT/session behavior remains unchanged for internal routes. [VERIFIED: apps/api/src/app.ts] |
| V4 Access Control | yes | Add quote permissions to catalog and require backend permissions on every quote route. [VERIFIED: apps/api/src/permissions/permissions.ts] |
| V5 Input Validation | yes | Use Zod schemas for IDs, enums, dates, quantities and money. [CITED: https://zod.dev/api] |
| V6 Cryptography | yes | Use opaque random secure-link tokens and store hashes, not plaintext secrets. [ASSUMED] |
| V7 Error Handling | yes | Reuse global error handler; avoid leaking token/PDF internals. [VERIFIED: apps/api/src/app.ts] |
| V10 Malicious Code | yes | Package gate passed for new PDF packages and no postinstall scripts were reported. [VERIFIED: npm registry] |
| V14 Configuration | yes | Do not add public static serving for PDFs unless explicitly planned and tenant-safe. [ASSUMED] |

### Known Threat Patterns for Node/Express/Prisma Quote Flow

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant quote/customer/vehicle/product access | Information Disclosure / Tampering | Every query filters by authenticated `tenantId`; foreign IDs return 404/bad request. [VERIFIED: apps/api/src/tenancy/tenantScope.ts] |
| Published quote mutation | Tampering / Repudiation | Store immutable snapshot rows and audit any administrative changes. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| PDF exposing internal costs/notes | Information Disclosure | Customer-facing DTO excludes cost, margin, supplier and internal notes. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md] |
| Token leakage in audit/logs | Information Disclosure | Store token hash and sanitize audit metadata keys containing token/secret/hash. [VERIFIED: apps/api/src/audit/auditService.ts] |
| Communication automation creep | Spoofing / Repudiation / Policy violation | Copy/print only; no send routes, message tables or delivery/read states. [VERIFIED: AGENTS.md] |

## Sources

### Primary (HIGH confidence)
- `AGENTS.md` - stack, tenant, security, communication, quality and audit constraints. [VERIFIED: codebase grep]
- `.planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md` - locked Phase 6 decisions. [VERIFIED: codebase grep]
- `.planning/REQUIREMENTS.md` - QTE-01 through QTE-11 requirement text. [VERIFIED: codebase grep]
- `prisma/schema.prisma`, `apps/api/src/**`, `apps/web/src/**` - current implementation anchors. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)
- https://www.prisma.io/docs/orm/prisma-client/queries/transactions - transaction guidance. [CITED: official docs]
- https://pdfkit.org/docs/getting_started.html - PDFKit stream and HTTP response guidance. [CITED: official docs]
- https://expressjs.com/en/5x/api/response/ - response headers/attachment API. [CITED: official docs]
- https://zod.dev/api - number and enum validation guidance. [CITED: official docs]
- npm registry checks for versions, publish metadata and postinstall scripts. [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- Assumptions in the Assumptions Log that require planner/user confirmation before hard-locking. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for existing stack and MEDIUM for adding PDFKit; package gate and official docs checked. [VERIFIED: npm registry]
- Architecture: HIGH for codebase integration points and MEDIUM for inferred model names/route names. [VERIFIED: codebase grep]
- Pitfalls: MEDIUM because primary risks come from phase context, with some implementation warning signs inferred. [VERIFIED: .planning/phases/06-diagn-stico-e-or-amento/06-CONTEXT.md]

**Research date:** 2026-07-28
**Valid until:** 2026-08-27 for stack guidance; re-check npm versions before install. [ASSUMED]
