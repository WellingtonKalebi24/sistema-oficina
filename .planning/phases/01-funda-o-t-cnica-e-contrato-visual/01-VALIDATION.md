# Phase 01 Validation Map

This file maps Phase 01 requirements to the plan tasks that implement them and the validation expected from executors. Automated validation is required wherever the behavior can be proven by commands; manual validation is reserved for visual review and developer setup confidence.

| Requirement | Plan Tasks | Automated Validation | Manual Validation |
|-------------|------------|----------------------|-------------------|
| FND-01 | `01-01` Task 1; `01-02` Task 3; `01-03` Task 2 | `docker compose config`; `docker compose up --build -d db api`; `docker compose up --build -d db api web`; `Invoke-RestMethod http://localhost:3000/health \| ConvertTo-Json -Compress` | Confirm the web app and API URLs documented in `docs/LOCAL_SETUP.md` open locally after Docker Desktop or equivalent daemon is running. |
| FND-02 | `01-02` Task 1 | `npm run db:migrate` from a clean PostgreSQL database | Review the committed Prisma migration directory exists under `prisma/migrations` and corresponds to the neutral Phase 01 schema. |
| FND-03 | `01-01` Task 1; `01-03` Task 2 | `npm run format:check`; `npm run lint --workspace apps/api`; `npm run lint --workspace apps/web`; `npm run typecheck --workspace apps/api`; `npm run typecheck --workspace apps/web`; `npm run verify` | Confirm root scripts are named consistently in `package.json` for developer use. |
| FND-04 | `01-02` Task 2; `01-02` Task 3 | `npm run test --workspace apps/api`; `Invoke-RestMethod http://localhost:3000/health \| ConvertTo-Json -Compress` | Inspect the health response during local smoke testing and confirm it reports database connectivity, not only process startup. |
| FND-05 | `01-02` Task 2 | `npm run test --workspace apps/api` | Review forced-error behavior does not return stack traces, raw env values or secrets. |
| FND-06 | `01-02` Task 2 | `npm run test --workspace apps/api` | Inspect local API logs during smoke testing and confirm they are structured JSON without request bodies or env dumps. |
| FND-07 | `01-02` Task 1 | `npm run db:seed` | Confirm repeat seed runs keep deterministic development data and do not create business-domain records. |
| FND-08 | `01-01` Task 1; `01-03` Task 2 | `npm run verify`; `docker compose config` | Follow `docs/LOCAL_SETUP.md` once and confirm prerequisites, env setup, migration, seed, verify and Docker commands are accurate. |
| VUX-01 | `01-03` Task 3 | `rg -n "palette\|typography\|spacing\|radius\|tables\|filters\|modals\|loading\|skeleton\|empty\|success\|error\|destructive\|keyboard\|contrast\|pt-BR\|BRL" docs/VISUAL_CONTRACT.md` | Review `docs/VISUAL_CONTRACT.md` as the canonical JO.IA visual reference for later screens. |
| VUX-02 | `01-03` Task 1; `01-03` Task 3 | `npm run test --workspace apps/web`; visual-contract `rg` coverage command | Review the first UI and contract for palette, typography, spacing, radius, shadows, buttons, forms, tables, filters, modals and status colors. |
| VUX-03 | `01-03` Task 1; `01-03` Task 3 | `npm run test --workspace apps/web`; visual-contract `rg` coverage command | Confirm loading, skeleton, empty, success, error and destructive confirmation states appear as operational UI patterns, not business placeholders. |
| VUX-04 | `01-03` Task 1; `01-03` Task 3 | `npm run test --workspace apps/web`; visual-contract `rg` coverage command | Keyboard through the first UI and confirm visible focus, labeled controls and contrast guidance. |
| VUX-05 | `01-03` Task 1; `01-03` Task 3 | `npm run test --workspace apps/web`; visual-contract `rg` coverage command | Confirm visible dates, times and currency examples use Brazilian business formatting. |

## Phase Gate

Phase 01 is valid only when the plan summaries show the relevant automated commands passing and the manual checks above are either completed or explicitly recorded as pending human verification. The RED walking-skeleton verification in `01-01-PLAN.md` is successful only when the test fails with the expected missing-implementation diagnostic; later plans must make that same contract pass through real API, database and web behavior.
