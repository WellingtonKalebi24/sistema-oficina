---
phase: 05-agenda-e-recepcao
plan: 08
subsystem: api
tags: [node, express, multer, prisma, reception, attachments, audit, tenancy]

requires:
  - phase: 05-agenda-e-recepcao
    provides: Private upload root, CheckInAttachment schema and attachment permission keys from 05-07
provides:
  - Protected check-in attachment upload, list, download and delete API
  - Tenant-scoped attachment service with generated stored filenames and path containment checks
  - Route-scoped Multer middleware with size, file count, field count and MIME limits
  - Upload/delete audit rows with metadata only and soft-deleted attachment records
affects: [05-agenda-e-recepcao, api, reception, attachments, audit, permissions]

tech-stack:
  added: []
  patterns:
    - Route-scoped multipart parsing after backend permission middleware
    - Attachment bytes are streamed only after tenant/check-in/attachment DB ownership lookup
    - Attachment deletes soft-delete metadata and attempt physical byte removal

key-files:
  created:
    - apps/api/src/test/reception-attachments.test.ts
    - apps/api/src/reception/attachmentService.ts
    - apps/api/src/http/routes/receptionAttachments.ts
  modified:
    - apps/api/src/test/testData.ts
    - apps/api/src/reception/receptionSchemas.ts
    - apps/api/src/app.ts

key-decisions:
  - "Mounted `/reception/check-ins/:checkInId/attachments` as authenticated API routes only; no public static upload route was added."
  - "Required attachment write permission before Multer parses multipart bodies so unauthorized users do not trigger upload work."
  - "Generated server-side stored names and kept original filenames as metadata only, never as storage paths."

patterns-established:
  - "Protected attachment routes use permission middleware, then tenant-scoped service lookup, then filesystem access."
  - "Attachment audit payloads include category/checkInId/MIME/size metadata and exclude file bytes and long file contents."

requirements-completed: [REC-05, REC-07, REC-08]

coverage:
  - id: D1
    description: "Protected check-in attachment upload, list, download and soft-delete API supports optional files and canonical D-09 categories."
    requirement: REC-05
    verification:
      - kind: integration
        ref: "apps/api/src/test/reception-attachments.test.ts#REC-05 uploads, lists, downloads and soft-deletes optional check-in attachments"
        status: pass
      - kind: integration
        ref: "apps/api/src/test/reception-attachments.test.ts#REC-05 accepts canonical D-09 categories without blocking check-in completion"
        status: pass
      - kind: other
        ref: "npm run test -w apps/api -- reception-attachments"
        status: pass
    human_judgment: false
  - id: D2
    description: "Attachment bytes and metadata require tenant ownership and backend read/write/delete permissions."
    requirement: REC-07
    verification:
      - kind: integration
        ref: "apps/api/src/test/reception-attachments.test.ts#REC-07 blocks cross-tenant list, download and delete without exposing metadata or bytes"
        status: pass
      - kind: integration
        ref: "apps/api/src/test/reception-attachments.test.ts#D-11 enforces separate backend permissions for attachment read, write and delete"
        status: pass
      - kind: other
        ref: "rg \"express\\.static|app\\.use\\([^\\r\\n]*uploads|/uploads\" apps/api/src"
        status: pass
    human_judgment: false
  - id: D3
    description: "Upload and deletion write audit rows while deletion keeps metadata soft-deleted and removes bytes when feasible."
    requirement: REC-08
    verification:
      - kind: integration
        ref: "apps/api/src/test/reception-attachments.test.ts#REC-08 audits upload and delete with metadata only"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
      - kind: other
        ref: "npm run lint -w apps/api"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-28
status: complete
---

# Phase 05 Plan 08: Protected Reception Attachments Summary

**Protected check-in attachment API with tenant-scoped uploads, backend permission checks, private file streaming and audit-safe soft deletion.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-28T02:40:37Z
- **Completed:** 2026-07-28T02:49:55Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- Added RED integration coverage for multipart upload, list, download, soft-delete, physical unlink, path traversal filename handling, permission denial, tenant isolation and absence of public static upload serving.
- Implemented `attachmentService` with tenant/check-in ownership lookups, generated stored names, resolved path containment and audit rows for upload/delete.
- Mounted protected attachment routes under `/reception/check-ins/:checkInId/attachments` after auth, with separate read/write/delete permission middleware and route-scoped Multer limits.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add attachment API contracts** - `bd6127e` (test)
2. **Task 2: Implement protected attachment service and routes** - `cd8687a` (feat)

**Plan metadata:** recorded in final docs commit.

_Note: This plan used TDD task gates. RED failed on missing attachment routes before GREEN implementation._

## Files Created/Modified

- `apps/api/src/test/testData.ts` - Adds `checkInAttachment` cleanup before check-in deletion.
- `apps/api/src/test/reception-attachments.test.ts` - Covers protected attachment upload/list/download/delete, cross-tenant denial, permissions, audit and no public static route.
- `apps/api/src/reception/receptionSchemas.ts` - Adds canonical attachment categories and create-attachment validation schema.
- `apps/api/src/reception/attachmentService.ts` - Owns tenant-safe metadata persistence, download lookup, soft-delete, file unlink and serialization.
- `apps/api/src/http/routes/receptionAttachments.ts` - Adds route-scoped Multer upload middleware and protected attachment HTTP routes.
- `apps/api/src/app.ts` - Mounts the attachment router inside the authenticated API section.

## Verification

- `npm run test -w apps/api -- reception-attachments` - PASS with 2 files / 8 tests.
- `npm run typecheck -w apps/api` - PASS.
- `npm run lint -w apps/api` - PASS.
- `rg "express\\.static|app\\.use\\([^\\r\\n]*uploads|/uploads" apps/api/src` - PASS; only the test assertion for `/uploads/reception/...` matched.

## TDD Gate Compliance

- RED commit exists: `bd6127e` (`test(05-08): add failing reception attachment contract`).
- GREEN commit exists after RED: `cd8687a` (`feat(05-08): implement protected reception attachments`).
- Refactor commit was not needed.

## Decisions Made

- Mounted attachment routes separately from the JSON reception router so multipart parsing stays route-scoped and explicit.
- Placed `requirePermission` before Multer on upload routes to keep backend authorization authoritative before file parsing.
- Used generated server filenames with sanitized extensions; `originalName` is metadata only and is never used to resolve storage paths.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made traversal filename test assert storage safety instead of parser preservation**
- **Found during:** Task 2 (Implement protected attachment service and routes)
- **Issue:** The RED test expected the multipart parser/client to preserve `../segredo/avaria.jpg` literally in `originalName`, but parser behavior may normalize path-like filenames.
- **Fix:** Kept the traversal scenario but asserted the returned original name contains the user filename while the generated `storedName` contains no traversal/path segment.
- **Files modified:** `apps/api/src/test/reception-attachments.test.ts`
- **Verification:** `npm run test -w apps/api -- reception-attachments` passed.
- **Committed in:** `cd8687a`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** The fix preserved the planned security assertion without relying on multipart client filename normalization details.

## Issues Encountered

- `npm exec prisma generate` initially failed because the command environment lacked `DATABASE_URL`; rerunning with the existing local PostgreSQL URL regenerated Prisma Client successfully.
- Vitest emits an existing `pg` deprecation warning about `client.query()` while tests pass; this is outside 05-08 scope.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: file-streaming | `apps/api/src/http/routes/receptionAttachments.ts` | New protected download route streams local files only after permission and tenant/check-in/attachment lookup. |
| threat_flag: multipart-upload | `apps/api/src/http/routes/receptionAttachments.ts` | New multipart upload surface is route-scoped with file size/count/type limits and permission middleware before parsing. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 05-09 to wire attachment behavior into the web reception UI/client using the protected API routes. Backend routes now satisfy REC-05, REC-07 and REC-08 without public upload exposure.

## Self-Check: PASSED

- Found created files `apps/api/src/test/reception-attachments.test.ts`, `apps/api/src/reception/attachmentService.ts`, `apps/api/src/http/routes/receptionAttachments.ts` and `.planning/phases/05-agenda-e-recep-o/05-08-SUMMARY.md`.
- Found task commits `bd6127e` and `cd8687a` in git history.
- Coverage metadata validated with `gsd-tools.cjs uat classify-coverage --summary .planning/phases/05-agenda-e-recep-o/05-08-SUMMARY.md`.

---
*Phase: 05-agenda-e-recepcao*
*Completed: 2026-07-28*
