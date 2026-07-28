---
phase: 05-agenda-e-recepcao
plan: 07
subsystem: api
tags: [node, express, multer, prisma, postgres, docker-compose, reception, attachments]

requires:
  - phase: 05-agenda-e-recepcao
    provides: Check-in schema, API and UI surface from 05-04 through 05-06
provides:
  - Approved Multer runtime dependency without SUS type package
  - Private reception upload root configuration for API and Docker Compose
  - Tenant-scoped CheckInAttachment schema with soft-delete audit metadata
  - Reception attachment read, write and delete permission keys
affects: [05-agenda-e-recepcao, api, database, infra, permissions, attachments]

tech-stack:
  added: [multer]
  patterns:
    - Narrow local declaration files for approved packages when SUS type packages are forbidden
    - Reception upload bytes remain behind backend routes by using a private API volume and no public static mount
    - Attachment metadata carries tenant, check-in and deletion ownership for later route-level authorization

key-files:
  created:
    - apps/api/src/types/multer.d.ts
    - apps/api/src/test/reception-attachments-schema.test.ts
    - prisma/migrations/20260724110000_add_checkin_attachments/migration.sql
    - .planning/phases/05-agenda-e-recep-o/deferred-items.md
  modified:
    - package-lock.json
    - apps/api/package.json
    - apps/api/src/config/env.ts
    - compose.yaml
    - .env.example
    - prisma/schema.prisma
    - apps/api/src/permissions/permissions.ts

key-decisions:
  - "Installed only the approved `multer` runtime dependency and used a local narrow declaration instead of the SUS `@types/multer` package."
  - "Configured `RECEPTION_UPLOAD_ROOT=uploads/reception` as a private API filesystem root with Docker volume wiring and no public static serving."
  - "Stored attachment categories as text plus a PostgreSQL check constraint for the D-09 canonical values."

patterns-established:
  - "Reception attachments use database metadata as the future authorization source rather than trusting file paths."
  - "Soft-deleted attachment metadata keeps `deletedAt` and `deletedByUserId` available for audit while later services can block downloads."

requirements-completed: [REC-05, REC-07, REC-08]

coverage:
  - id: D1
    description: "Approved upload dependency and private upload root are configured without installing `@types/multer` or exposing `/uploads` statically."
    requirement: REC-05
    verification:
      - kind: other
        ref: "npm install multer -w apps/api"
        status: pass
      - kind: other
        ref: "npm run typecheck -w apps/api"
        status: pass
      - kind: other
        ref: "npm run docker:config"
        status: pass
      - kind: other
        ref: "npx prettier --check apps/api/src/types/multer.d.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "CheckInAttachment schema stores tenant/check-in ownership, canonical category metadata, file metadata and soft-delete audit fields."
    requirement: REC-07
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- reception-attachments-schema"
        status: pass
      - kind: other
        ref: "npm run db:migrate"
        status: pass
    human_judgment: false
  - id: D3
    description: "Reception attachment read, write and delete permission keys are present in the backend permission catalog."
    requirement: REC-08
    verification:
      - kind: integration
        ref: "npm run test -w apps/api -- reception-attachments-schema"
        status: pass
      - kind: other
        ref: "npm run lint -w apps/api"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-07-27
status: complete
---

# Phase 05 Plan 07: Attachment Prerequisites Summary

**Multer upload prerequisites, private Docker storage and tenant-scoped CheckInAttachment metadata are ready for protected reception attachment routes.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-27T23:18:00-03:00
- **Completed:** 2026-07-27T23:36:32-03:00
- **Tasks:** 2 completed
- **Files modified:** 11

## Accomplishments

- Installed only the approved `multer` package in `apps/api`; `@types/multer` was not installed.
- Added `RECEPTION_UPLOAD_ROOT=uploads/reception` parsing, `.env.example` documentation and a private Docker Compose volume for API upload storage.
- Added a narrow local `multer.d.ts` declaration for the API surface needed by later protected attachment routes.
- Added `CheckInAttachment` with tenant/check-in ownership, file metadata, canonical category constraint and soft-delete deletion metadata.
- Added `reception.attachments.read`, `reception.attachments.write` and `reception.attachments.delete` to the backend permission catalog.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install approved upload dependency and config** - `0db5400` (feat)
2. **Task 2 RED: Add attachment schema and permissions contract** - `84dcc40` (test)
3. **Task 2 GREEN: Add attachment schema and permissions** - `fd00163` (feat)
4. **Formatting follow-up** - `dcc5ad1` (style)

**Plan metadata:** recorded in final docs commit.

## Files Created/Modified

- `package-lock.json` - Captures the approved `multer` dependency tree.
- `apps/api/package.json` - Adds `multer` as an API runtime dependency.
- `apps/api/src/types/multer.d.ts` - Local declaration for the used Multer API only.
- `apps/api/src/config/env.ts` - Adds validated `receptionUploadRoot` config.
- `compose.yaml` - Adds `RECEPTION_UPLOAD_ROOT` and a private `joia_reception_uploads` API volume.
- `.env.example` - Documents the local reception upload root.
- `prisma/schema.prisma` - Adds `CheckInAttachment` relations and indexes.
- `prisma/migrations/20260724110000_add_checkin_attachments/migration.sql` - Creates the attachment metadata table and canonical category constraint.
- `apps/api/src/permissions/permissions.ts` - Adds attachment permission constants, list entries and display details.
- `apps/api/src/test/reception-attachments-schema.test.ts` - TDD contract for schema, migration category values and permissions.
- `.planning/phases/05-agenda-e-recep-o/deferred-items.md` - Tracks out-of-scope formatting warnings from prior Phase 5 files.

## Verification

- `npm install multer -w apps/api` - PASS.
- `npm run test -w apps/api -- reception-attachments-schema` - RED failed before implementation, then PASS with 1 file / 3 tests.
- `npm run db:migrate` - PASS after Docker Desktop/PostgreSQL were started; migration applied, then re-run reported already in sync.
- `npm run typecheck -w apps/api` - PASS.
- `npm run lint -w apps/api` - PASS.
- `npm run docker:config` - PASS.
- `npx prettier --check apps/api/src/types/multer.d.ts` - PASS.

## TDD Gate Compliance

- RED commit exists: `84dcc40` (`test(05-07): add failing attachment schema contract`).
- GREEN commit exists after RED: `fd00163` (`feat(05-07): add check-in attachment schema`).
- Refactor/style follow-up exists after GREEN: `dcc5ad1`.

## Decisions Made

- Used a local declaration file for Multer because the plan explicitly forbade installing the SUS `@types/multer` package.
- Kept upload storage private to the API container via Docker volume and did not add any public static route.
- Enforced D-09 category persistence in the SQL migration with a check constraint while keeping Prisma field type as `String`, matching existing text-based Phase 5 status patterns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Started local Docker/PostgreSQL for migration verification**
- **Found during:** Task 2 (Add attachment schema and permissions)
- **Issue:** `npm run db:migrate` could not run while Docker Desktop/PostgreSQL were unavailable; direct PostgreSQL connection to `localhost:55432` was refused.
- **Fix:** Started Docker Desktop, brought up the Compose `db` service and re-ran the migration successfully.
- **Files modified:** None.
- **Verification:** `npm run db:migrate` applied `20260724110000_add_checkin_attachments` and later reported the schema was in sync.
- **Committed in:** Not applicable, environment repair only.

**2. [Rule 3 - Blocking] Fixed test type narrowing for permission detail lookup**
- **Found during:** Task 2 (Add attachment schema and permissions)
- **Issue:** The RED test initially indexed `PERMISSION_DETAILS` with a plain `string`, causing API typecheck failure after runtime tests passed.
- **Fix:** Reused the typed `PERMISSIONS.receptionAttachments*` constants in the test and spread them for `arrayContaining`.
- **Files modified:** `apps/api/src/test/reception-attachments-schema.test.ts`
- **Verification:** `npm run typecheck -w apps/api` and `npm run test -w apps/api -- reception-attachments-schema` passed.
- **Committed in:** `fd00163`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes were required to complete the planned verification without broadening product scope.

## Issues Encountered

- `npm audit` after installing `multer` reported 5 existing vulnerabilities (4 moderate, 1 high). No package substitutions or force fixes were attempted because the plan approved only `multer`.
- `npm run format:check` still fails on files from prior Phase 5 plans. The only 05-07-owned warning was fixed in `dcc5ad1`; the remaining out-of-scope warnings are recorded in `deferred-items.md`.
- Initial Prisma migrate attempts emitted an unhelpful schema engine error while PostgreSQL was unavailable; once Docker/PostgreSQL were running, the same migration succeeded.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 05-08 to implement protected attachment upload/list/download/delete services and routes on top of the configured storage root, metadata schema and permission keys.

## Self-Check: PASSED

- Found created files `apps/api/src/types/multer.d.ts`, `apps/api/src/test/reception-attachments-schema.test.ts`, `prisma/migrations/20260724110000_add_checkin_attachments/migration.sql`, `.planning/phases/05-agenda-e-recep-o/05-07-SUMMARY.md` and `.planning/phases/05-agenda-e-recep-o/deferred-items.md`.
- Found task commits `0db5400`, `84dcc40`, `fd00163` and `dcc5ad1` in git history.
- Coverage metadata validated with `gsd-tools.cjs uat classify-coverage --summary .planning/phases/05-agenda-e-recep-o/05-07-SUMMARY.md`.

---
*Phase: 05-agenda-e-recepcao*
*Completed: 2026-07-27*
