---
phase: 06
slug: diagnostico-e-orcamento
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 for API and web |
| **Config file** | `apps/api/vitest.config.ts`; `apps/web/vite.config.ts` |
| **Quick run command** | `npm run test -w apps/api -- quote-contract quote-calculator quote-versioning quote-pdf && npm run test -w apps/web -- quote-ui` |
| **Full suite command** | `npm run verify` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the targeted quote API/web test for the touched slice.
- **After every plan wave:** Run `npm run verify`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 180 seconds for targeted checks; full verify may take longer.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-W0-01 | 01 | 0 | QTE-01..QTE-04 | T-06-tenant | Diagnosis and quote create paths are tenant-scoped and permission-protected | integration | `npm run test -w apps/api -- quote-contract` | no - W0 | pending |
| 06-W0-02 | 01 | 0 | QTE-05, QTE-06, QTE-07 | T-06-totals | Totals are backend-calculated; above-limit discount is warning-only per D-08 | unit + integration | `npm run test -w apps/api -- quote-calculator quote-contract` | no - W0 | pending |
| 06-W0-03 | 02 | 1 | QTE-08, QTE-09 | T-06-immutable | Published commercial snapshots cannot be mutated in place | integration | `npm run test -w apps/api -- quote-versioning` | no - W0 | pending |
| 06-W0-04 | 03 | 2 | QTE-10 | T-06-pdf | PDF renders from persisted published version snapshot and hides internal data | integration | `npm run test -w apps/api -- quote-pdf` | no - W0 | pending |
| 06-W0-05 | 04 | 2 | QTE-11 | T-06-manual-link | Link/PDF actions are available only after publication and never send automatically | UI + integration | `npm run test -w apps/web -- quote-ui` | no - W0 | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/test/quote-contract.test.ts` - contract tests for diagnosis and draft quote creation.
- [ ] `apps/api/src/test/quote-calculator.test.ts` - totals, per-item adjustments, quote-level adjustments and warning-only discount limit behavior.
- [ ] `apps/api/src/test/quote-versioning.test.ts` - immutable publication and new-version copy semantics.
- [ ] `apps/api/src/test/quote-pdf.test.ts` - PDF/link generation from published version snapshot, with internal data hidden.
- [ ] `apps/web/src/test/quote-ui.test.tsx` - authenticated quote UI, required markers, warning states and post-publication actions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Printed PDF visual inspection | QTE-10 | Automated tests can verify content and response, but not final print readability in the browser print dialog | Open a published quote, generate PDF/print preview, confirm grouped service/product sections, totals and no internal data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 180s for targeted checks.
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 tests exist and pass.

**Approval:** pending
