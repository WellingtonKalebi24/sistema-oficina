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

Phase 2 authentication uses these local variables from `.env.example`:

- `JWT_ACCESS_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`
- `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`
- `PASSWORD_RESET_TTL_MINUTES`
- `VITE_API_BASE_URL=http://localhost:3001`

SMTP variables are optional for local development and are limited to authentication password recovery. Do not configure customer communication, message delivery or notification features.

## Install

```powershell
npm install
```

## Database

Start the database and API:

```powershell
docker compose up --build -d db api
```

Apply migrations and seed deterministic foundation and permission data:

```powershell
$env:DATABASE_URL="postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public"
npm run db:migrate
npm run db:seed
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

Use the Phase 2 web flow:

1. If `/bootstrap/status` reports `bootstrapped: false`, the web app opens the bootstrap form.
2. Create the first tenant and administrator with local development values.
3. Return to login and enter with the administrator email/password.
4. Confirm the authenticated shell shows compact sections for `Oficina`, `Usuarios`, `Papeis`, `Permissoes` and `Seguranca`.
5. Use `Oficina` for company settings, `Usuarios` for user creation, `Papeis` for role setup and `Permissoes` for permission overrides.

The frontend may hide menu entries based on effective permissions, but backend authorization remains authoritative. A backend `403` appears in the UI as `Acesso bloqueado pela permissao do servidor.`

Use the Phase 3 customer and vehicle flow after login:

1. Confirm the authenticated menu shows `Clientes` for users with `customers.read` and `Veiculos` for users with `vehicles.read`.
2. Open `Clientes`, create a customer with name, optional phone and optional CPF/CNPJ. CNPJ may contain letters; active duplicate documents are rejected by the backend, while shared phone numbers remain allowed.
3. Search customers by name, phone or document and confirm the active table updates.
4. Edit the customer, open its basic history rows, then use the destructive confirmation to soft-delete only when intended.
5. Open `Veiculos`, select the current customer, create a vehicle with plate and optional chassis/VIN, brand, model, year, color and mileage.
6. Search vehicles by plate or related customer, edit the current customer link, inspect history/current link context and confirm active duplicate plate or chassis/VIN errors are displayed.
7. Verify there are no customer communication controls in these screens; the system does not send customer messages or register delivery/read state.

Useful local API checks:

```powershell
curl.exe http://localhost:3001/health
curl.exe http://localhost:3001/bootstrap/status
curl.exe -I http://localhost:5173
```

## Quality Gates

Run the full repository verification:

```powershell
npm run verify
```

The command runs format check, lint, type check and tests across workspaces.

Phase 2 final validation:

```powershell
$env:DATABASE_URL="postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public"
npm run db:migrate
npm run verify
npm run docker:config
docker compose up --build -d db api web
docker compose ps
curl.exe http://localhost:3001/health
curl.exe http://localhost:3001/bootstrap/status
curl.exe -I http://localhost:5173
```

Phase 3 final validation:

```powershell
$env:DATABASE_URL="postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public"
npm run db:migrate
npm run test -w apps/api -- customer-vehicles
npm run test -w apps/web -- customer-vehicle-ui App
npm run verify
npm run docker:config
docker compose up --build -d db api web
docker compose ps
curl.exe http://localhost:3001/health
curl.exe -I http://localhost:5173
```

## Troubleshooting

- If Docker commands hang, verify the engine:

```powershell
docker --context desktop-linux info --format '{{.ServerVersion}}'
```

- If Docker Desktop cannot write to disk, confirm `C:` and the Docker storage target have free space.
- If Prisma cannot connect, confirm `docker compose ps` shows PostgreSQL healthy and `DATABASE_URL` uses host port `55432`.
- If the web app cannot reach the API, confirm `VITE_API_BASE_URL=http://localhost:3001`.
