# Phase 1 Walking Skeleton

## Project scaffold

- Root package: npm workspaces.
- Workspaces: `apps/web`, `apps/api`, `packages/shared`.
- Root quality commands: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`.
- Stack: React, Vite, TypeScript, Node.js, Express, TypeScript, PostgreSQL, Prisma and Docker Compose.

## Routing

- Web app entry: `apps/web/src/main.tsx`.
- Web screen: `apps/web/src/App.tsx`.
- Web API client: `apps/web/src/api/foundationChecks.ts`.
- API app factory: `apps/api/src/app.ts`.
- API server startup: `apps/api/src/server.ts`.
- API routes:
  - `GET /health`
  - `GET /foundation-checks`
  - `POST /foundation-checks`

## Database

- Prisma schema: `prisma/schema.prisma`.
- Migration: `prisma/migrations/20260714233600_init_foundation_check/migration.sql`.
- Seed: `prisma/seed.ts`.
- Neutral model: `FoundationCheck`.
- Phase 1 intentionally does not add tenants, users, customers, vehicles, stock, quotes, work orders, finance, portal, reports or communication models.

## UI

- Visual contract: `docs/VISUAL_CONTRACT.md`.
- CSS tokens and first state patterns: `apps/web/src/styles.css`.
- Formatting helpers: `apps/web/src/design/formatters.ts`.
- The first screen is a compact operational workspace that proves a real web to API to PostgreSQL interaction.
- Loading, skeleton, empty, success, error and destructive confirmation examples are represented without business data.

## Docker Compose

Services:

- `db`: PostgreSQL 17 Alpine, healthchecked with `pg_isready`, host port `55432`.
- `api`: Express API, container port `3000`, host port `3001`, depends on healthy `db`.
- `web`: Vite dev server, host port `5173`, uses `VITE_API_BASE_URL=http://localhost:3001`.

Run:

```powershell
docker compose up --build -d db api web
```

Health check:

```powershell
Invoke-RestMethod http://localhost:3001/health | ConvertTo-Json -Compress
```

## FoundationCheck flow

1. Operator opens `http://localhost:5173`.
2. Operator enters a neutral foundation label.
3. Web app posts to `POST /foundation-checks`.
4. API validates the label and writes through Prisma.
5. PostgreSQL persists the row.
6. Web app displays the returned row and existing persisted rows.

## Out of scope for Phase 1

- Authentication, authorization and tenant isolation.
- Customer, vehicle, stock, quote, work order, finance, portal, dashboard and reporting modules.
- Automatic customer communication.
- Notification centers, message queues, WhatsApp integration, email integration, SMS or push behavior.

## Later phases

- Phase 2 adds auth, permissions and tenant isolation on top of the API/database patterns.
- Business phases replace neutral `FoundationCheck` examples with tenant-scoped domain entities.
- UI phases should follow `docs/VISUAL_CONTRACT.md` and keep backend authorization authoritative.
