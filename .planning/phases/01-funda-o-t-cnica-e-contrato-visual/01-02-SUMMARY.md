---
phase: 01-funda-o-t-cnica-e-contrato-visual
plan: 02
subsystem: api-database-infra
tags: [express, prisma, postgresql, docker-compose, pino, vitest]
requires:
  - phase: 01-funda-o-t-cnica-e-contrato-visual
    provides: npm workspace scaffold and root quality scripts from 01-01
provides:
  - Prisma FoundationCheck baseline with committed migration and deterministic seed
  - Express API factory/server with DB-connected health route
  - neutral foundation-check write/read route backed by PostgreSQL
  - sanitized global error handling and structured request logging
  - Docker Compose services for PostgreSQL and API with DB health ordering
affects: [phase-01, phase-02, api, database, docker, testing]
tech-stack:
  added:
    - PostgreSQL 17 Alpine Docker service
    - Prisma FoundationCheck model and migration
    - Pino/Pino HTTP logging in API runtime
    - Helmet and CORS API middleware
  patterns:
    - Express createApp factory separated from server startup
    - shared Prisma client adapter used by route handlers
    - Compose db/api service names kept stable for later web wiring
    - API build emits dist from src only
key-files:
  created:
    - prisma/schema.prisma
    - prisma/migrations/20260714233600_init_foundation_check/migration.sql
    - prisma/seed.ts
    - prisma.config.ts
    - apps/api/Dockerfile
    - apps/api/src/app.ts
    - apps/api/src/config/env.ts
    - apps/api/src/db/prisma.ts
    - apps/api/src/http/errors.ts
    - apps/api/src/http/routes/health.ts
    - apps/api/src/http/routes/foundationChecks.ts
    - apps/api/src/logging/logger.ts
    - apps/api/src/test/app.test.ts
    - apps/api/src/test/prisma-baseline.test.ts
    - compose.yaml
  modified:
    - .env.example
    - apps/api/src/server.ts
    - apps/api/tsconfig.build.json
    - eslint.config.mjs
key-decisions:
  - "Used a neutral `FoundationCheck` model only; no auth, tenant, customer, stock, quote, OS, finance, notification, WhatsApp or email domain entities were introduced in Phase 1."
  - "Mapped container API port 3000 to host port 3001 to avoid colliding with local app defaults while keeping API_PORT stable inside the container."
  - "Kept Docker services named `db` and `api` so later web service wiring can depend on stable Compose DNS/service names."
patterns-established:
  - "Runtime code imports environment through `apps/api/src/config/env.ts` and avoids logging raw env values."
  - "API route handlers return serialized JSON records and delegate database access to the shared Prisma client."
  - "Docker Compose waits on PostgreSQL health before starting the API."
requirements-completed: [FND-01, FND-02, FND-04, FND-05, FND-06, FND-07]
coverage:
  - id: D1
    description: "Clean PostgreSQL database accepts the committed Prisma FoundationCheck migration."
    requirement: FND-02
    verification:
      - kind: integration
        ref: "DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public npx prisma migrate deploy"
        status: pass
      - kind: integration
        ref: "DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public npx prisma migrate status"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deterministic seed creates repeatable neutral FoundationCheck data."
    requirement: FND-07
    verification:
      - kind: integration
        ref: "DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public npx prisma db seed"
        status: pass
      - kind: unit
        ref: "apps/api/src/test/prisma-baseline.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "API health route proves database connectivity before reporting ok."
    requirement: FND-04
    verification:
      - kind: unit
        ref: "apps/api/src/test/app.test.ts#reports database-connected health"
        status: pass
      - kind: integration
        ref: "Invoke-RestMethod http://localhost:3001/health"
        status: pass
    human_judgment: false
  - id: D4
    description: "Foundation write/read route persists neutral rows in PostgreSQL."
    requirement: FND-01
    verification:
      - kind: unit
        ref: "apps/api/src/test/app.test.ts#persists and reads neutral foundation checks"
        status: pass
      - kind: integration
        ref: "POST/GET http://localhost:3001/foundation-checks"
        status: pass
    human_judgment: false
  - id: D5
    description: "Global error middleware returns sanitized JSON without leaking secrets or stack traces."
    requirement: FND-05
    verification:
      - kind: unit
        ref: "apps/api/src/test/app.test.ts#returns sanitized JSON for unexpected errors"
        status: pass
    human_judgment: false
  - id: D6
    description: "API request logs are structured and avoid request bodies or environment values."
    requirement: FND-06
    verification:
      - kind: unit
        ref: "apps/api/src/test/app.test.ts#emits structured request logs without body or environment values"
        status: pass
    human_judgment: false
  - id: D7
    description: "Docker Compose starts PostgreSQL and API together with database healthcheck ordering."
    requirement: FND-01
    verification:
      - kind: integration
        ref: "docker compose config"
        status: pass
      - kind: integration
        ref: "docker compose up --build -d db api"
        status: pass
      - kind: integration
        ref: "docker compose ps"
        status: pass
    human_judgment: false
duration: multi-session
completed: 2026-07-17
status: complete
---

# Phase 01 Plan 02: Backend Foundation and Docker Runtime Summary

**Prisma/PostgreSQL foundation with DB-connected Express health, neutral write/read route, sanitized errors, structured logging and Docker Compose runtime**

## Performance

- **Duration:** Multi-session due Docker Desktop storage/service recovery.
- **Started:** 2026-07-14T20:32:32Z
- **Completed:** 2026-07-17T23:46:09Z
- **Tasks:** 3 total: Prisma baseline, API routes/logging/errors, Docker Compose runtime.
- **Files modified:** 18 source/config files plus this summary.

## Accomplishments

- Added Prisma 7 baseline with a neutral `FoundationCheck` model, committed migration and deterministic seed.
- Built an Express API with `createApp()`, runtime `server.ts`, environment parsing, shared Prisma client, `/health`, `/foundation-checks`, sanitized error middleware and structured logging.
- Added API tests covering DB-connected health, persisted write/read, sanitized errors and log shape.
- Added `compose.yaml` and `apps/api/Dockerfile` so PostgreSQL and API build/start together with PostgreSQL health ordering.
- Verified the backend half of the walking skeleton against a clean composed database.

## Task Commits

| Task | Name | Commit | Type | Files |
| --- | --- | --- | --- | --- |
| 0 | Add failing Prisma/API baseline tests | `4d6dc38` | test | Prisma/API RED coverage |
| 1 | Add Prisma baseline with deterministic seed | `8bbfb85` | feat | Prisma schema, migration, seed, Prisma config |
| 2 | Build API health, error, logging and foundation routes | `d439abd` | feat | API app/server/config/db/http/logging/tests |
| 3 | Wire Docker Compose for PostgreSQL and API | `fe91d08` | feat | Compose, API Dockerfile, env/build/lint config |

## Files Created/Modified

- `prisma/schema.prisma` - Defines neutral `FoundationCheck` model only.
- `prisma/migrations/20260714233600_init_foundation_check/migration.sql` - Initial Prisma migration.
- `prisma/seed.ts` - Repeatable local seed for foundation diagnostics.
- `prisma.config.ts` - Prisma 7 config loading `DATABASE_URL`.
- `apps/api/src/app.ts` - Express app factory with middleware and route composition.
- `apps/api/src/server.ts` - Runtime startup and shutdown handling.
- `apps/api/src/config/env.ts` - Environment parsing without raw secret logging.
- `apps/api/src/db/prisma.ts` - Shared Prisma client adapter.
- `apps/api/src/http/errors.ts` - HTTP error helpers and sanitized global handler.
- `apps/api/src/http/routes/health.ts` - DB-connected health check.
- `apps/api/src/http/routes/foundationChecks.ts` - Neutral persisted write/read route.
- `apps/api/src/logging/logger.ts` - Structured logger setup.
- `apps/api/src/test/app.test.ts` - API behavior coverage.
- `apps/api/src/test/prisma-baseline.test.ts` - Prisma/seed/schema baseline coverage.
- `apps/api/Dockerfile` - API image build and startup.
- `compose.yaml` - PostgreSQL and API services with health ordering.
- `.env.example` - Host/container local DB and API port examples.
- `apps/api/tsconfig.build.json` / `eslint.config.mjs` - Build and lint exclusions needed for generated output.

## Decisions Made

- Kept Phase 1 data model neutral by using only `FoundationCheck`; business, auth, tenant and communication entities remain Phase 2+.
- Exposed API on host port `3001` while keeping container `API_PORT=3000`; `.env.example` documents `API_HOST_PORT=3001`.
- Used `prisma migrate deploy` for final clean-database verification against Docker Compose so the committed migration history is the source of truth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker Desktop storage on C: prevented image builds**
- **Found during:** Task 3 verification.
- **Issue:** Docker BuildKit failed with storage errors while `C:` was nearly full and Docker's VHDX lived under `C:\Users\MEIP\AppData\Local\Docker\wsl\disk`.
- **Fix:** Stopped Docker/WSL, moved `docker_data.vhdx` to `E:\DockerDesktop\wsl\disk`, and created a junction from the original Docker Desktop path to the new `E:` location.
- **Files modified:** Host Docker Desktop storage only; no repository files.
- **Verification:** `docker --context desktop-linux info --format '{{.ServerVersion}}'` returned `29.6.1`; `docker compose up --build -d db api` passed afterward.
- **Committed in:** n/a, host setup change.

**2. [Rule 3 - Blocking] API TypeScript build copied generated test output into runtime image**
- **Found during:** Task 3 Docker image build.
- **Issue:** The API build needed to emit runtime files from `src` while excluding tests and avoiding stale/generated output from lint scans.
- **Fix:** Added `include: ["src"]` to `apps/api/tsconfig.build.json` and made ESLint generated-output ignores recursive.
- **Files modified:** `apps/api/tsconfig.build.json`, `eslint.config.mjs`.
- **Verification:** `npm run lint`, `npm run typecheck`, and `docker compose up --build -d db api` pass.
- **Committed in:** `fe91d08`.

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** Both fixes were required to make the planned Docker/API verification executable. No business scope, tenant/auth scope or communication features were introduced.

## Issues Encountered

- `Start-Service com.docker.service` still reports a Windows permission error in the non-elevated shell, but Docker Desktop engine is reachable and verified through `docker --context desktop-linux info`.
- The plan's health command used `localhost:3000`; the actual host port is `3001` because `compose.yaml` maps host `API_HOST_PORT` to container `API_PORT=3000`. The endpoint verification used `http://localhost:3001/health`.
- `npm run verify` remains intentionally unsuitable as a full green gate until Plan 01-03 implements the web half of the walking skeleton; Plan 01-02 used the targeted backend/Compose gates listed below.

## Tests Run

| Command | Result |
| --- | --- |
| `docker --context desktop-linux info --format '{{.ServerVersion}}'` | Pass, `29.6.1` |
| `docker compose config` | Pass |
| `docker compose up --build -d db api` | Pass |
| `docker compose ps` | Pass, `db` healthy and `api` up |
| `DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public npx prisma migrate deploy` | Pass |
| `DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public npx prisma db seed` | Pass |
| `DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public npx prisma migrate status` | Pass |
| `DATABASE_URL=postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public npm run test --workspace apps/api` | Pass, 2 files / 6 tests |
| `npm run format:check` | Pass |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `Invoke-RestMethod http://localhost:3001/health` | Pass, `status: ok`, `database: connected` |
| `POST http://localhost:3001/foundation-checks` with `codex-final-smoke` | Pass, persisted `status: recorded` |
| `GET http://localhost:3001/foundation-checks` | Pass, returned persisted rows including `codex-final-smoke` |

## User Setup Required

Docker Desktop storage has already been moved on this machine to `E:\DockerDesktop\wsl\disk` via a junction from the original Docker path. Keep `E:` available before starting Docker Desktop.

## Next Phase Readiness

Plan 01-03 can now implement the web half of the walking skeleton against the running API on `http://localhost:3001`. The remaining RED root walking-skeleton contract should become green once the Vite app and full-stack smoke flow are added.

## Self-Check: PASSED

- Found expected backend files, Compose files, Prisma migration and this summary.
- Verified task commits: `4d6dc38`, `8bbfb85`, `d439abd`, `fe91d08`.
- Verified requirements covered: FND-01, FND-02, FND-04, FND-05, FND-06 and FND-07.

---
*Phase: 01-funda-o-t-cnica-e-contrato-visual*
*Completed: 2026-07-17*
