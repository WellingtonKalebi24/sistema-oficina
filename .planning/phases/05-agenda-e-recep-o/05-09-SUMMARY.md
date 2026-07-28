---
phase: 05-agenda-e-recepcao
plan: 09
subsystem: ui
tags: [react, typescript, reception, attachments, formdata, tests]

requires:
  - phase: 05-agenda-e-recepcao
    provides: Protected attachment API routes and canonical attachment categories from 05-08
provides:
  - Optional check-in attachment UI inside the persisted check-in detail panel
  - FormData web client helpers for protected attachment upload/list/download/delete
  - UI tests for optional attachments, canonical categories and server-authoritative 403/404 states
affects: [05-agenda-e-recepcao, web, reception, attachments, uat]

tech-stack:
  added: []
  patterns:
    - FormData API helper omits manual Content-Type so the browser sets the multipart boundary
    - Check-in detail owns attachment list state and treats backend errors as authoritative
    - Attachment downloads use the protected API response blob instead of raw storage paths

key-files:
  created:
    - .planning/phases/05-agenda-e-recep-o/05-09-SUMMARY.md
  modified:
    - apps/web/src/api/reception.ts
    - apps/web/src/test/reception-ui.test.tsx
    - apps/web/src/App.tsx
    - apps/web/src/styles.css

key-decisions:
  - "Kept attachment selection out of the check-in completion form so missing files never block D-08 check-in completion."
  - "Used the backend D-09 categories `Avaria`, `Documento`, `Painel`, `Motor`, `Interior` and `Outro` in the UI, overriding the older UI-SPEC photo/document/other wording."
  - "Handled attachment 403/404 responses in the detail panel as server-authoritative states rather than client-side permission assumptions."

patterns-established:
  - "Reception attachment UI is scoped to a persisted check-in detail and refreshes/list-mutates through protected API helpers."
  - "Multipart requests are built in the API client with FormData and no explicit JSON Content-Type."

requirements-completed: [REC-05, REC-06, REC-07, REC-08]

coverage:
  - id: D1
    description: "Check-in can be completed without selecting attachment files."
    requirement: REC-05
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/reception-ui.test.tsx#D-08 completes check-in with no selected attachment files"
        status: pass
      - kind: other
        ref: "npm run test -w apps/web -- reception-ui"
        status: pass
    human_judgment: false
  - id: D2
    description: "Check-in detail lists persisted attachments with filename, category, size, upload state and delete/download actions."
    requirement: REC-06
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/reception-ui.test.tsx#D-09 lists and uploads optional check-in attachments with canonical categories"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/web"
        status: pass
      - kind: other
        ref: "npm run lint -w apps/web"
        status: pass
    human_judgment: false
  - id: D3
    description: "Attachment UI respects backend 403/404 responses for access, download and deletion."
    requirement: REC-07
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/reception-ui.test.tsx#D-11 treats backend 403 and 404 on attachment delete/download as authoritative states"
        status: pass
      - kind: other
        ref: "npm run test -w apps/web -- reception-ui"
        status: pass
    human_judgment: false
  - id: D4
    description: "Attachment delete confirmation names the file and avoids customer-contact language."
    requirement: REC-08
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/reception-ui.test.tsx#D-11 treats backend 403 and 404 on attachment delete/download as authoritative states"
        status: pass
      - kind: automated_ui
        ref: "apps/web/src/test/reception-ui.test.tsx#assertNoCommunicationLanguage"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-28
status: complete
---

# Phase 05 Plan 09: Optional Reception Attachment UI Summary

**Optional check-in attachments are now wired through protected FormData APIs with persisted list, upload, download, delete and server-authoritative error states.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-28T02:53:00Z
- **Completed:** 2026-07-28T03:01:34Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- Added RED UI coverage proving attachments are optional for check-in completion, canonical D-09 categories are shown, FormData upload omits manual Content-Type and 403/404 responses are treated as backend-authoritative.
- Implemented `reception.ts` attachment helpers for list, upload, protected blob download and delete.
- Added an attachment area to the check-in detail panel with filename, category, size, `Pendente`/`Enviado` states, delete confirmation naming the file and blocked/not-found error copy.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add UI tests for optional attachments** - `f78b86e` (test)
2. **Task 2: Implement attachment client and UI** - `a9325aa` (feat)

**Plan metadata:** recorded in final docs commit.

_Note: This plan used TDD task gates. RED failed on missing attachment UI before GREEN implementation._

## Files Created/Modified

- `apps/web/src/api/reception.ts` - Adds attachment types and protected list/upload/download/delete helpers, including FormData multipart handling.
- `apps/web/src/test/reception-ui.test.tsx` - Adds deterministic reception UI tests for optional files, persisted attachments, canonical categories and server-authoritative errors.
- `apps/web/src/App.tsx` - Wires authenticated attachment callbacks and renders the attachment panel inside check-in detail.
- `apps/web/src/styles.css` - Adds compact attachment row/list styles for the operational panel.

## Verification

- `npm run test -w apps/web -- reception-ui` - PASS with 1 file / 10 tests.
- `npm run typecheck -w apps/web` - PASS.
- `npm run lint -w apps/web` - PASS.

## TDD Gate Compliance

- RED commit exists: `f78b86e` (`test(05-09): add failing reception attachment UI contracts`).
- GREEN commit exists after RED: `a9325aa` (`feat(05-09): implement optional reception attachments UI`).
- Refactor commit was not needed.

## Decisions Made

- Kept attachment upload out of the check-in completion form and only inside persisted check-in detail, preserving D-08 optionality.
- Used the D-09 categories from the phase context/plan as canonical UI options: `Avaria`, `Documento`, `Painel`, `Motor`, `Interior`, `Outro`.
- Treated attachment 403/404 API responses as authoritative UI states and did not infer authorization from hidden controls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed reception UI test clock determinism**
- **Found during:** Task 1 (Add UI tests for optional attachments)
- **Issue:** Existing reception UI tests relied on the current system date while fixtures and mocked routes use `2026-07-24`, causing unrelated agenda failures.
- **Fix:** Added a fixed Vitest system time for the reception UI suite.
- **Files modified:** `apps/web/src/test/reception-ui.test.tsx`
- **Verification:** `npm run test -w apps/web -- reception-ui` then isolated attachment RED showed only missing attachment UI failures; final suite passed after GREEN.
- **Committed in:** `f78b86e`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** The fix made planned UI tests deterministic and did not change production behavior.

## Issues Encountered

- Initial GREEN typecheck caught strict optional typing in the test mock and `BodyInit` typing for FormData assignment; both were fixed before the Task 2 commit.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 05-10 to complete any remaining Phase 5 close-out or verification work. Attachment UI now consumes the protected API from 05-08 without customer-contact copy or raw storage path exposure.

## Self-Check: PASSED

- Found `.planning/phases/05-agenda-e-recep-o/05-09-SUMMARY.md`.
- Found task commits `f78b86e` and `a9325aa` in git history.
- Coverage metadata validated with `gsd-tools.cjs uat classify-coverage --summary .planning/phases/05-agenda-e-recep-o/05-09-SUMMARY.md`.

---
*Phase: 05-agenda-e-recepcao*
*Completed: 2026-07-28*
