---
phase: 01-funda-o-t-cnica-e-contrato-visual
plan: 03
subsystem: frontend-infra-docs
tags: [react, vite, docker-compose, visual-contract, pt-BR, vitest]
requires:
  - phase: 01-funda-o-t-cnica-e-contrato-visual
    provides: backend FoundationCheck API, Prisma migration and Docker db/api runtime from 01-02
provides:
  - React/Vite web app that writes and reads FoundationCheck records through the API
  - web Docker service added to Compose alongside db and api
  - full-stack local setup documentation
  - JO.IA visual contract for later operational screens
  - walking skeleton record for future phase planning
affects: [phase-01, phase-02, frontend, ui-contract, docker, docs]
tech-stack:
  added:
    - Vite React app entry and jsdom component tests
    - Docker web service
    - pt-BR date/time and BRL currency helpers
  patterns:
    - web API client reads `VITE_API_BASE_URL` with local default `http://localhost:3001`
    - compact operational SaaS UI uses CSS variables from the visual contract
    - root `npm run verify` is the green phase gate
key-files:
  created:
    - apps/web/Dockerfile
    - apps/web/index.html
    - apps/web/vite.config.ts
    - apps/web/src/main.tsx
    - apps/web/src/App.tsx
    - apps/web/src/api/foundationChecks.ts
    - apps/web/src/design/formatters.ts
    - apps/web/src/styles.css
    - apps/web/src/test/App.test.tsx
    - apps/web/src/test/formatters.test.ts
    - docs/LOCAL_SETUP.md
    - docs/VISUAL_CONTRACT.md
  modified:
    - compose.yaml
    - .env.example
    - tests/walking-skeleton.test.ts
    - apps/api/src/test/app.test.ts
    - apps/api/src/test/prisma-baseline.test.ts
    - .planning/phases/01-funda-o-t-cnica-e-contrato-visual/SKELETON.md
key-decisions:
  - "The first web screen is a compact operational workspace, not a landing page or marketing composition."
  - "The web app uses only neutral FoundationCheck data; no dashboard metrics, auth controls, tenant setup, customer data, stock, quotes, work orders, finance, portal, reports or communication features were introduced."
  - "Root tests default to the local Compose DATABASE_URL so `npm run verify` works when the documented stack is running."
patterns-established:
  - "Web tests declare jsdom at file level so root Vitest and workspace Vitest both run the same component tests."
  - "Future UI screens should follow `docs/VISUAL_CONTRACT.md` and reuse compact panels, table density, focus styles and status colors."
  - "Alerts remain calculated visual states only and do not imply notification centers or outbound messaging."
requirements-completed: [FND-01, FND-03, FND-08, VUX-01, VUX-02, VUX-03, VUX-04, VUX-05]
coverage:
  - id: D1
    description: "Web app submits a neutral foundation check to the API and renders the persisted row."
    requirement: FND-01
    verification:
      - kind: unit
        ref: "apps/web/src/test/App.test.tsx#lets the operator submit a foundation check and see persisted API data"
        status: pass
      - kind: integration
        ref: "POST/GET http://localhost:3001/foundation-checks with web-stack-smoke"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full stack Compose runs db, api and web services together."
    requirement: FND-01
    verification:
      - kind: integration
        ref: "docker compose up --build -d db api web"
        status: pass
      - kind: integration
        ref: "docker compose ps"
        status: pass
      - kind: integration
        ref: "curl.exe -I http://localhost:5173"
        status: pass
    human_judgment: false
  - id: D3
    description: "Root verification passes formatting, lint, typecheck and tests across the repository."
    requirement: FND-03
    verification:
      - kind: other
        ref: "npm run verify"
        status: pass
    human_judgment: false
  - id: D4
    description: "Local setup docs give exact commands and expected outputs for Docker, migrations, seed and verification."
    requirement: FND-08
    verification:
      - kind: other
        ref: "docs/LOCAL_SETUP.md"
        status: pass
    human_judgment: false
  - id: D5
    description: "JO.IA visual contract defines palette, typography, spacing, components, states, accessibility and Brazilian formatting."
    requirement: VUX-01
    verification:
      - kind: other
        ref: "rg visual contract required terms"
        status: pass
    human_judgment: false
  - id: D6
    description: "CSS variables and the first UI demonstrate operational palette, typography, spacing, radius, shadows, buttons, forms, tables and status colors."
    requirement: VUX-02
    verification:
      - kind: unit
        ref: "apps/web/src/test/App.test.tsx#presents a compact operational workspace without marketing copy"
        status: pass
    human_judgment: false
  - id: D7
    description: "UI covers loading, skeleton, empty, success, error and destructive confirmation states."
    requirement: VUX-03
    verification:
      - kind: unit
        ref: "apps/web/src/test/App.test.tsx#renders loading, empty, success, error and destructive confirmation states accessibly"
        status: pass
    human_judgment: false
  - id: D8
    description: "UI includes labels, keyboard focus styles and contrast guidance."
    requirement: VUX-04
    verification:
      - kind: unit
        ref: "apps/web/src/test/App.test.tsx"
        status: pass
      - kind: other
        ref: "docs/VISUAL_CONTRACT.md"
        status: pass
    human_judgment: false
  - id: D9
    description: "Date/time and BRL currency helpers use Brazilian Portuguese formatting."
    requirement: VUX-05
    verification:
      - kind: unit
        ref: "apps/web/src/test/formatters.test.ts"
        status: pass
    human_judgment: false
duration: same-session
completed: 2026-07-17
status: complete
---

# Phase 01 Plan 03: Web Walking Skeleton and Visual Contract Summary

**React/Vite operator surface wired to the FoundationCheck API with Docker web service, local setup docs and JO.IA visual contract**

## Performance

- **Duration:** Same-session after 01-02 Docker recovery.
- **Started:** 2026-07-17T23:46:09Z
- **Completed:** 2026-07-18T00:01:16Z
- **Tasks:** 3 total: web interaction, Docker/docs, visual contract/skeleton record.
- **Files modified:** 19 implementation/doc files plus this summary and state updates.

## Accomplishments

- Replaced the placeholder web workspace with a React/Vite app that loads persisted FoundationCheck rows and posts new rows to the API.
- Added compact JO.IA UI styling with CSS variables, table layout, form controls, focus styles and loading/empty/success/error/destructive states.
- Added web tests for API interaction, state rendering, operational composition and Brazilian formatters.
- Added a Docker web service to `compose.yaml` and verified `db`, `api` and `web` together.
- Wrote local setup and visual contract docs plus `SKELETON.md` for future planning context.
- Converted the root walking skeleton contract from intentional RED to green.

## Task Commits

| Task | Name | Commit | Type | Files |
| --- | --- | --- | --- | --- |
| 1 | Build web UI interaction wired to the API | `83e92b1` | feat | React app, API client, formatters, CSS, web tests |
| 2 | Add web service to Docker and document local setup | `83e92b1` | feat/docs | web Dockerfile, Compose web service, local setup docs |
| 3 | Write JO.IA visual contract and walking skeleton record | `83e92b1` | docs | visual contract and skeleton record |

## Files Created/Modified

- `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/vite.config.ts` - Vite React entry and test config.
- `apps/web/src/App.tsx` - Compact operational foundation screen.
- `apps/web/src/api/foundationChecks.ts` - API client for Plan 02 endpoints.
- `apps/web/src/design/formatters.ts` - `pt-BR` date/time and BRL helpers.
- `apps/web/src/styles.css` - First JO.IA UI tokens and states.
- `apps/web/src/test/App.test.tsx`, `apps/web/src/test/formatters.test.ts` - Web UI and formatter coverage.
- `apps/web/Dockerfile` - Vite dev server container.
- `compose.yaml` - Adds `web` service.
- `docs/LOCAL_SETUP.md` - Local runbook.
- `docs/VISUAL_CONTRACT.md` - Canonical visual contract.
- `.planning/phases/01-funda-o-t-cnica-e-contrato-visual/SKELETON.md` - Walking skeleton record.
- `tests/walking-skeleton.test.ts` - Root contract now checks implemented files/services instead of throwing the RED diagnostic.
- `apps/api/src/test/*.test.ts` - API tests default to documented local Compose database when `DATABASE_URL` is absent.

## Decisions Made

- Used `http://localhost:3001` for the browser-facing API base URL in Docker because the browser runs on the host and cannot resolve Compose DNS names such as `api`.
- Kept web content neutral and foundation-only; future domain flows start in later roadmap phases.
- Documented calculated visual alerts only and avoided notification-shaped product behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root `npm run verify` did not inherit workspace Vitest settings**
- **Found during:** Task 2 verification.
- **Issue:** Root Vitest ran web component tests without jsdom and API tests without `DATABASE_URL`.
- **Fix:** Added file-level jsdom environment for `App.test.tsx` and defaulted API tests to the documented local Compose database URL.
- **Files modified:** `apps/web/src/test/App.test.tsx`, `apps/api/src/test/app.test.ts`, `apps/api/src/test/prisma-baseline.test.ts`.
- **Verification:** `npm run verify` passes.
- **Committed in:** `83e92b1`.

**2. [Rule 3 - Blocking] PowerShell `Invoke-WebRequest` hit a local NullReference on Vite HTML**
- **Found during:** Task 2 verification.
- **Issue:** `Invoke-WebRequest http://localhost:5173` threw a PowerShell `NullReferenceException` even though the web server was running.
- **Fix:** Verified the web surface with `curl.exe -I http://localhost:5173` and `curl.exe -s http://localhost:5173`.
- **Files modified:** None.
- **Verification:** `curl.exe -I` returned `HTTP/1.1 200 OK` and HTML contained `JO.IA Oficina`.
- **Committed in:** n/a.

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** Both were verification-enablement fixes. No scope creep or communication features were introduced.

## Issues Encountered

- Docker image builds are slower after moving Docker Desktop storage to `E:\DockerDesktop\wsl\disk`, but the stack now builds and runs with adequate free space.
- npm audit still reports the moderate Prisma advisory documented in Plan 01-01; no dependency downgrade was made in this UI plan.

## Tests Run

| Command | Result |
| --- | --- |
| `npm run test --workspace apps/web` | Pass, 2 files / 5 tests |
| `npm run typecheck --workspace apps/web` | Pass |
| `npm run lint --workspace apps/web` | Pass |
| forbidden term scan over `apps/web/src` and `prisma/schema.prisma` | Pass |
| `docker compose config` | Pass |
| `docker compose up --build -d db api web` | Pass |
| `docker compose ps` | Pass, `db`, `api`, `web` up; `db` healthy |
| `Invoke-RestMethod http://localhost:3001/health` | Pass |
| `curl.exe -I http://localhost:5173` | Pass, `HTTP/1.1 200 OK` |
| `curl.exe -s http://localhost:5173` | Pass, HTML includes `JO.IA Oficina` and `/src/main.tsx` |
| `npm run verify` | Pass, 5 files / 14 tests |
| visual contract required-term `rg` | Pass |
| skeleton required-term `rg` | Pass |
| `POST/GET http://localhost:3001/foundation-checks` with `web-stack-smoke` | Pass |

## User Setup Required

None for repository setup. Docker Desktop must remain available, and this machine expects Docker's WSL disk junction to `E:\DockerDesktop\wsl\disk` to stay valid.

## Next Phase Readiness

Phase 1 is complete. Phase 2 can plan authentication, tenant isolation and permissions on top of the verified React/Vite + Express + Prisma + PostgreSQL + Docker Compose skeleton.

## Self-Check: PASSED

- Found expected web, docs, visual contract and skeleton files.
- Root `npm run verify` passed.
- Full Docker stack with `db`, `api` and `web` is running.
- Phase 1 requirements FND-01 through FND-08 and VUX-01 through VUX-05 are covered by summaries 01-01, 01-02 and 01-03.

---
*Phase: 01-funda-o-t-cnica-e-contrato-visual*
*Completed: 2026-07-17*
