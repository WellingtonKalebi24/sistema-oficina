---
phase: 01-funda-o-t-cnica-e-contrato-visual
plan: 01
subsystem: infra
tags: [npm-workspaces, typescript, eslint, prettier, vitest, vite, express, prisma]
requires: []
provides:
  - npm workspace scaffold for apps/web, apps/api and packages/shared
  - root quality scripts for lint, format check, type check, test, verify, database and Docker commands
  - strict TypeScript baseline and lint/format tooling
  - sample-only environment documentation
  - RED walking-skeleton contract for later API, database and web implementation
affects: [phase-01, phase-02, tooling, testing]
tech-stack:
  added:
    - npm workspaces
    - React 19.2.7
    - Vite 8.1.4
    - Express 5.2.1
    - Prisma 7.8.0
    - TypeScript 6.0.3
    - Vitest 4.1.10
    - ESLint 10.7.0
    - Prettier 3.9.5
  patterns:
    - root scripts fan out to workspaces with npm
    - strict shared TypeScript config extended by each workspace
    - RED contract test uses EXPECTED_MISSING_IMPLEMENTATION until later plans implement the slice
key-files:
  created:
    - package.json
    - package-lock.json
    - .env.example
    - tsconfig.base.json
    - eslint.config.mjs
    - .prettierrc
    - .prettierignore
    - apps/web/package.json
    - apps/web/tsconfig.json
    - apps/web/src/main.ts
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/src/server.ts
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
    - tests/walking-skeleton.test.ts
  modified:
    - .gitignore
key-decisions:
  - "Resolved the package legitimacy gate by using only audited package names and registry/source metadata from the Phase 1 research audit; no substitute package names were installed."
  - "Pinned TypeScript to 6.0.3 instead of researched latest 7.0.2 because typescript-eslint 8.64.0 requires TypeScript <6.1.0."
  - "Kept Prisma 7.8.0 despite a moderate npm audit advisory because the available audit fix downgrades Prisma to 6.19.3, which would be an architectural version change outside Plan 01."
patterns-established:
  - "Workspace packages are named @joia/web, @joia/api and @joia/shared."
  - "Root validation commands are the developer entry point for quality checks."
  - "Real .env files, npm cache, GSD runtime files and local temp output remain untracked."
requirements-completed: [FND-01, FND-03, FND-08]
coverage:
  - id: D1
    description: "npm workspace scaffold declares apps/web, apps/api and packages/shared with root fanout scripts."
    requirement: FND-01
    verification:
      - kind: other
        ref: "npm run lint"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Quality tooling exists for lint, format check, type check and tests."
    requirement: FND-03
    verification:
      - kind: other
        ref: "npm run format:check"
        status: pass
      - kind: unit
        ref: "npm run test -- tests/walking-skeleton.test.ts expecting EXPECTED_MISSING_IMPLEMENTATION"
        status: pass
    human_judgment: false
  - id: D3
    description: ".env.example documents sample-only local configuration and .env files are ignored."
    requirement: FND-08
    verification:
      - kind: other
        ref: "rg forbidden-domain scan over package.json apps packages tests"
        status: pass
    human_judgment: false
duration: 12min
completed: 2026-07-14
status: complete
---

# Phase 01 Plan 01: Gated npm Workspace Scaffold and RED Contract Summary

**npm workspace foundation with strict TypeScript tooling and an intentional RED walking-skeleton contract for the future full-stack proof**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-14T20:20:48Z
- **Completed:** 2026-07-14T20:32:32Z
- **Tasks:** 2 total: 1 package gate resolved, 1 auto task completed
- **Files modified:** 18

## Accomplishments

- Created the root npm workspace scaffold for `apps/web`, `apps/api` and `packages/shared`.
- Added root scripts for `lint`, `format:check`, `typecheck`, `test`, `verify`, `db:migrate`, `db:seed`, `docker:config` and `docker:smoke`.
- Added strict TypeScript, ESLint flat config, Prettier config, `.env.example`, lockfile and neutral shared foundation contract.
- Added `tests/walking-skeleton.test.ts`, which fails with `EXPECTED_MISSING_IMPLEMENTATION` until Plans 02 and 03 implement the API, database and web slice.

## Task Commits

| Task | Name | Commit | Type | Files |
| --- | --- | --- | --- | --- |
| 0 | Approve SUS package legitimacy gate | n/a | checkpoint resolved | package metadata verified from registry and research audit |
| 1 | Create workspace quality scaffold and failing skeleton contract | `eb8444b` | test | workspace package files, tooling config, `.env.example`, shared contract, RED test |

## Files Created/Modified

- `package.json` - Root npm workspace scripts and dev tooling dependencies.
- `package-lock.json` - Pinned resolved package graph.
- `.gitignore` - Ignores secrets, dependencies, build output and generated local tool/cache directories.
- `.env.example` - Sample-only local environment variables.
- `tsconfig.base.json` - Strict shared TypeScript baseline.
- `eslint.config.mjs` - ESLint flat config with TypeScript and Prettier compatibility.
- `.prettierrc` / `.prettierignore` - Formatting rules and generated/source-of-truth exclusions.
- `apps/web/package.json` / `apps/web/tsconfig.json` / `apps/web/src/main.ts` - Web workspace scaffold.
- `apps/api/package.json` / `apps/api/tsconfig.json` / `apps/api/src/server.ts` - API workspace scaffold.
- `packages/shared/package.json` / `packages/shared/tsconfig.json` / `packages/shared/src/index.ts` - Shared workspace and neutral foundation contract.
- `tests/walking-skeleton.test.ts` - RED contract for Docker, migration, seed, health, foundation API and web interaction.

## Decisions Made

- Used the audited package names only; no similarly named package substitutions were made.
- Pinned `typescript@6.0.3` because the researched latest `7.0.2` conflicts with `typescript-eslint@8.64.0` peer requirements.
- Pinned current real DefinitelyTyped versions for `@types/react` and `@types/react-dom` after registry checks.
- Kept Prisma 7.8.0 for stack continuity; the npm audit fix requires a major downgrade to Prisma 6.19.3 and should be decided in a Prisma-focused plan if needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript latest conflicted with lint tooling**
- **Found during:** Task 1 package installation
- **Issue:** `typescript@7.0.2` did not satisfy `typescript-eslint@8.64.0` peer dependency `>=4.8.4 <6.1.0`.
- **Fix:** Installed `typescript@6.0.3`, the latest stable prior minor of the same legitimate package.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run lint` and `npm run typecheck` pass.
- **Committed in:** `eb8444b`

**2. [Rule 3 - Blocking] Incorrect assumed DefinitelyTyped versions**
- **Found during:** Task 1 package installation
- **Issue:** `@types/react-dom@19.2.7` did not exist.
- **Fix:** Queried the registry and pinned `@types/react@19.2.17` and `@types/react-dom@19.2.3` from DefinitelyTyped.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** npm install completed and typecheck passes.
- **Committed in:** `eb8444b`

**3. [Rule 3 - Blocking] npm cache could not write to full C drive**
- **Found during:** Task 1 package installation
- **Issue:** npm failed with `ENOSPC` while writing `C:\Users\MEIP\AppData\Local\npm-cache`; `C:` had zero free bytes.
- **Fix:** Retried with `npm_config_cache=E:\sistema_oficina2\.npm-cache` and ignored `.npm-cache/`.
- **Files modified:** `.gitignore`
- **Verification:** npm install completed.
- **Committed in:** `eb8444b`

**4. [Rule 3 - Blocking] Empty app workspaces broke lint and typecheck**
- **Found during:** Task 1 verification
- **Issue:** ESLint and TypeScript failed because `apps/web` and `apps/api` had no source inputs yet.
- **Fix:** Added neutral exported constants in `apps/web/src/main.ts` and `apps/api/src/server.ts`.
- **Files modified:** `apps/web/src/main.ts`, `apps/api/src/server.ts`
- **Verification:** `npm run lint` and `npm run typecheck` pass.
- **Committed in:** `eb8444b`

**5. [Rule 3 - Blocking] Formatting scan included generated GSD runtime files**
- **Found during:** Task 1 verification
- **Issue:** `prettier . --check` scanned untracked `.codex/` runtime files and source-of-truth project docs.
- **Fix:** Added `.codex/`, `.planning`, `.tmp`, `AGENTS.md` and `PROJETO.md` to `.prettierignore`.
- **Files modified:** `.prettierignore`
- **Verification:** `npm run format:check` passes.
- **Committed in:** `eb8444b`

**Total deviations:** 5 auto-fixed blocking issues.
**Impact on plan:** All fixes were required to make the scaffold installable and verifiable. No business modules, notification concepts or communication integrations were introduced.

## Issues Encountered

- `npm audit --json` reports 3 moderate advisories through `prisma@7.8.0` -> `@prisma/dev` -> `@hono/node-server`. The available npm audit fix downgrades Prisma to `6.19.3` as a semver-major change, so this was documented rather than forced in Plan 01.
- `npm run verify` was not used as a green gate because Plan 01 intentionally keeps the walking-skeleton contract RED. The targeted RED verification command passed by detecting `EXPECTED_MISSING_IMPLEMENTATION`.

## Tests Run

| Command | Result |
| --- | --- |
| `npm run test -- tests/walking-skeleton.test.ts` with RED wrapper expecting `EXPECTED_MISSING_IMPLEMENTATION` | Pass |
| `npm run format:check` | Pass |
| `rg -n "Tenant\|User\|Customer\|Vehicle\|Product\|Quote\|WorkOrder\|Payment\|Notification\|MessageQueue\|WhatsAppIntegration\|EmailIntegration" package.json apps packages tests -g "!package-lock.json"` | Pass |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm audit --json` | 3 moderate advisories; documented above |

## Known Stubs

None. The `apps/web/src/main.ts` and `apps/api/src/server.ts` exports are neutral scaffold inputs for lint/typecheck, not UI or API placeholders.

## Threat Flags

| Flag | File | Description |
| --- | --- | --- |
| threat_flag: dependency-audit | `package-lock.json` | Prisma 7.8.0 currently resolves a moderate advisory through `@hono/node-server`; fix requires a Prisma major-version downgrade. |

## User Setup Required

None for Plan 01. Later plans still need Docker and database implementation before local full-stack setup is complete.

## Next Phase Readiness

Plan 02 can build on the workspace names and scripts established here to add Prisma schema, migrations, seed, Express health/error/logging and the neutral foundation write/read API.

## Self-Check: PASSED

- Found expected key files: `package.json`, `package-lock.json`, `.env.example`, `tsconfig.base.json`, `eslint.config.mjs`, `tests/walking-skeleton.test.ts` and this summary.
- Found task commit: `eb8444b`.

---
*Phase: 01-funda-o-t-cnica-e-contrato-visual*
*Completed: 2026-07-14*
