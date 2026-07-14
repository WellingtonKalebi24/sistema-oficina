# Stack Research: JO.IA

## Selected Stack

- **Frontend**: React, Vite, TypeScript.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL.
- **ORM/Migrations**: Prisma.
- **Local/runtime infrastructure**: Docker Compose, environment variables, secure secret handling, versioned migrations and backup strategy.

## Implementation Notes

- Use a workspace layout that keeps frontend and backend boundaries explicit, with shared types only when they reduce duplication without coupling unrelated layers.
- Keep API authorization in backend middleware/services, not only in route hiding or UI conditions.
- Model tenant isolation as a default data-access concern. Every operational query should either derive tenant scope from the authenticated principal or go through a helper that enforces it.
- Use Prisma migrations as the source of schema history. Avoid ad hoc database changes.
- Add a seed for development that is deterministic and clearly separated from production data.
- Treat file uploads and attachments as tenant-scoped resources from the first phase that introduces them.

## Quality Gates

- `lint`, type check and automated tests must be part of phase completion.
- Database migrations must be runnable from a clean database.
- Docker Compose must bring up the API, web app and PostgreSQL for local verification.
- Critical flows should get integration or end-to-end coverage before they are marked complete.

## Decisions To Confirm Later

- Monorepo package manager and workspace tool.
- Authentication token storage strategy.
- Password hashing algorithm and token rotation policy.
- File storage provider for production.
- Deployment target and backup schedule.
