# JO.IA Local Setup

## Prerequisites

- Node.js 22 or newer.
- npm with workspace support.
- Docker Desktop or an equivalent Docker daemon.
- Docker data storage with enough free space. On this workstation, Docker Desktop data is stored through a junction from `C:\Users\MEIP\AppData\Local\Docker\wsl\disk` to `E:\DockerDesktop\wsl\disk`.

## Environment

Create a local `.env` from the sample file:

```powershell
Copy-Item .env.example .env
```

The committed values are sample-only. Do not commit real secrets. The expected local URLs are:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
- PostgreSQL host port: `55432`

## Install

```powershell
npm install
```

## Database

Start the database and API:

```powershell
docker compose up --build -d db api
```

Apply migrations and seed deterministic foundation data:

```powershell
$env:DATABASE_URL="postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public"
npx prisma migrate deploy
npx prisma db seed
```

Expected migration status:

```text
Database schema is up to date!
```

Expected seed status:

```text
The seed command has been executed.
```

## Run Full Stack

```powershell
docker compose up --build -d db api web
```

Check services:

```powershell
docker compose ps
```

Expected result:

- `db` is `healthy`.
- `api` is `Up` on `localhost:3001`.
- `web` is `Up` on `localhost:5173`.

Verify API health:

```powershell
Invoke-RestMethod http://localhost:3001/health | ConvertTo-Json -Compress
```

Expected shape:

```json
{ "status": "ok", "database": "connected", "checkedAt": "..." }
```

Open the web app:

```text
http://localhost:5173
```

Submit a neutral foundation label, such as `local-smoke`, and confirm it appears in the returned table.

## Quality Gates

Run the full repository verification:

```powershell
npm run verify
```

The command runs format check, lint, type check and tests across workspaces.

## Troubleshooting

- If Docker commands hang, verify the engine:

```powershell
docker --context desktop-linux info --format '{{.ServerVersion}}'
```

- If Docker Desktop cannot write to disk, confirm `C:` and the Docker storage target have free space.
- If Prisma cannot connect, confirm `docker compose ps` shows PostgreSQL healthy and `DATABASE_URL` uses host port `55432`.
- If the web app cannot reach the API, confirm `VITE_API_BASE_URL=http://localhost:3001`.
