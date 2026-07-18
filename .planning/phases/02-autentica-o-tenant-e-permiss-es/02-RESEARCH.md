# Phase 02: Autenticacao, Tenant e Permissoes - Research

**Researched:** 2026-07-18
**Domain:** Express/Prisma authentication, authorization, multi-tenant isolation, session security and admin UI
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Bootstrap And User Creation
- **D-01:** The system may expose an initial bootstrap route or flow to create the first tenant/admin user.
- **D-02:** After bootstrap is complete, user creation must be protected by backend authorization. UI hiding is not sufficient.
- **D-03:** Only a user with the permission to create admin users may create another user with admin-level permission.
- **D-04:** The admin interface must include a user creation/management menu for authorized administrators.

### Roles And Permissions
- **D-05:** Permissions must be configurable in Phase 2, not only hardcoded roles.
- **D-06:** The permission model must support user-specific permission overrides, matching requirement IDT-04.
- **D-07:** Backend permission checks are authoritative for every protected action introduced in this phase.

### Sessions
- **D-08:** Use multi-session behavior: a user may stay logged in on more than one device/session.
- **D-09:** Logout invalidates the active session without invalidating every other session for that user.
- **D-10:** Refresh token handling must still support secure invalidation and auditability for each session.

### Password Recovery
- **D-11:** Password recovery sends a reset code to the user's already-registered email address.
- **D-12:** The user completes password reset by providing the code and the new password.
- **D-13:** Reset codes and reset completion must be audited without storing secrets in audit logs.
- **D-14:** Email delivery is allowed for this authentication recovery flow. This decision does not authorize marketing, notification center behavior, WhatsApp, SMS, push, or automatic customer communication features.

### UI Surface
- **D-15:** The Phase 2 UI should add login, authenticated shell, tenant/company settings, user management and permission configuration surfaces following `docs/VISUAL_CONTRACT.md`.
- **D-16:** Admin menus and blocked states should be visible only where appropriate, but all enforcement must remain in the API.

### the agent's Discretion
- The planner may choose exact password hashing, reset-code format, token storage, refresh token rotation, email provider abstraction and permission naming if the choices fit the stack, security constraints and the user decisions above.
- The planner should keep bootstrap controlled and development-friendly while preventing an open public route after the first admin exists.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

None - discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 02 should build a backend-owned identity and authorization substrate: tenant creation/bootstrap, users, roles, permissions, user overrides, login, refresh sessions, logout, password reset/change, protected routes, audit records and tenant isolation tests. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] The project already has an Express 5 API with Helmet, CORS, JSON parsing, pino-http logging, global error handling, isolated routers and injectable Prisma client seams. [VERIFIED: codebase grep]

Use short-lived signed access JWTs plus persisted, hashed refresh-token session records. [CITED: https://github.com/panva/jose] Logout should revoke only the current `Session` row, and refresh should rotate only that session's refresh-token hash. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] Passwords should use Argon2id through `argon2`; reset codes should be random, single-use, hashed at rest, short-lived and audited without storing the code. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html]

**Primary recommendation:** Plan Phase 02 as three implementation bands: database/auth core, backend authorization plus audit tests, then compact admin UI wired to the API. [VERIFIED: codebase grep]

## Project Constraints (from AGENTS.md)

- Use React, Vite, TypeScript, Node.js, Express, TypeScript, PostgreSQL, Prisma and Docker Compose unless a recorded technical decision justifies a change. [VERIFIED: AGENTS.md]
- Enforce authorization in the backend; hiding frontend controls is not sufficient. [VERIFIED: AGENTS.md]
- Filter and validate all operational records by the authenticated tenant. [VERIFIED: AGENTS.md]
- Do not send messages, open WhatsApp automatically, or record communication delivery/read status; Phase 02 email is limited to auth recovery by locked decision D-14. [VERIFIED: AGENTS.md]
- Critical data-integrity workflows require database transactions; Phase 02 should apply the same standard to bootstrap, user/role/permission writes, refresh rotation and reset-code consumption. [VERIFIED: AGENTS.md] [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Audit critical actions with tenant, user, action, entity, record, timestamp and relevant values, without storing secrets. [VERIFIED: AGENTS.md]
- Do not complete the phase with lint, type check, tests, migrations or critical validations failing. [VERIFIED: AGENTS.md]
- Each phase needs executable verification; visible screens or created endpoints are not completion proof. [VERIFIED: AGENTS.md]
- Use GSD workflow artifacts for file-changing work. [VERIFIED: AGENTS.md]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IDT-01 | Admin can create and manage a tenant and its company settings. | Use transactional bootstrap plus protected tenant settings endpoints. [VERIFIED: .planning/REQUIREMENTS.md] |
| IDT-02 | Admin can create, edit, deactivate and list users within the authenticated tenant. | Use tenant-scoped user services and backend permission guards. [VERIFIED: .planning/REQUIREMENTS.md] |
| IDT-03 | Admin can create roles and assign permissions to users. | Use configurable `Role`, `Permission`, `RolePermission`, and user-role assignments. [VERIFIED: .planning/REQUIREMENTS.md] |
| IDT-04 | Admin can grant user-specific permission overrides. | Use explicit allow/deny override rows evaluated after role permissions. [VERIFIED: .planning/REQUIREMENTS.md] |
| IDT-05 | User can log in with secure password verification. | Use `argon2` Argon2id hashing and rate-limited login. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] |
| IDT-06 | User session can be refreshed with secure refresh token handling. | Use persisted hashed refresh tokens, rotation and session audit. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html] |
| IDT-07 | User can log out and invalidate the active session. | Revoke current `Session` only, per locked multi-session decision. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] |
| IDT-08 | User can request and complete a secure password reset. | Store hashed reset code with expiry and consume atomically. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] |
| IDT-09 | User can change password after authentication. | Require current password verification, hash new password, revoke/rotate current session as selected by planner. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] |
| IDT-10 | API blocks protected routes when authentication is missing or invalid. | Add `requireAuth` Express middleware before protected routers. [CITED: https://expressjs.com/en/guide/using-middleware.html] |
| IDT-11 | API blocks actions when user lacks required permission. | Add backend `requirePermission(permission)` guard and service-layer checks for admin-grant escalation. [VERIFIED: AGENTS.md] |
| IDT-12 | User from one tenant cannot read or modify data from another tenant. | Use tenant-scoped `where` filters and cross-tenant integration tests. [VERIFIED: .planning/research/ARCHITECTURE.md] |
| IDT-13 | Authentication, permission and sensitive user-management events are audited. | Add append-only `AuditLog` and call it from auth/permission services. [VERIFIED: AGENTS.md] |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Bootstrap first tenant/admin | API / Backend | Database / Storage | The decision to lock bootstrap after first admin requires authoritative server-side state and a transaction. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] |
| Tenant and company settings | API / Backend | Database / Storage, Browser / Client | The API owns tenant scope and persistence; UI is an admin surface only. [VERIFIED: AGENTS.md] |
| Login and password verification | API / Backend | Database / Storage | Password verification must not occur in the browser and hashes live in the database. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] |
| Refresh sessions and logout | API / Backend | Database / Storage, Browser / Client | Session invalidation requires persisted state; browser storage only carries the client token material. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] |
| Roles, permissions and overrides | API / Backend | Database / Storage, Browser / Client | Backend checks are authoritative; database stores configurable permissions; UI exposes management only to authorized users. [VERIFIED: AGENTS.md] |
| Tenant isolation | API / Backend | Database / Storage | Every service query must derive tenant scope from the authenticated principal and tests must prove no cross-tenant access. [VERIFIED: .planning/research/ARCHITECTURE.md] |
| Password recovery email | API / Backend | External SMTP provider | Email is allowed only for auth recovery and should be isolated behind an adapter. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] |
| Admin protected routes | Browser / Client | API / Backend | Client routing improves UX; backend remains the enforcement layer. [VERIFIED: AGENTS.md] |
| Audit logging | API / Backend | Database / Storage | Audit events are generated by server-side security-sensitive operations and persisted append-only. [VERIFIED: AGENTS.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express` | 5.2.1 installed | API routing and middleware | Existing backend framework and already configured in `apps/api/src/app.ts`. [VERIFIED: codebase grep] |
| `@prisma/client` + `prisma` | 7.8.0 installed | PostgreSQL ORM and migrations | Existing schema/migration tool and selected project stack. [VERIFIED: package.json] |
| `argon2` | 0.44.0 latest; created 2015-12-19; modified 2026-07-18 | Password hashing and verification | Official node-argon2 package provides Node bindings for Argon2; legitimacy verdict OK. [VERIFIED: npm registry] |
| `jose` | 6.2.3 latest; created 2014-02-27; modified 2026-04-27 | Access JWT signing and verification | Official docs support JWT signing/verifying and claims validation; legitimacy verdict OK. [VERIFIED: npm registry] |
| `zod` | 4.4.3 latest; created 2020-03-07; modified 2026-05-04 | Runtime validation for auth/admin request bodies | Official docs describe TypeScript-first schema validation; legitimacy verdict OK. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nodemailer` [WARNING: flagged as suspicious - verify before using.] | 9.0.3 latest; created 2011-01-21; modified 2026-06-30 | SMTP password reset code delivery | Use only behind an `EmailSender` adapter for auth recovery; do not create marketing/customer communication features. [CITED: https://nodemailer.com/smtp] |
| `express-rate-limit` [WARNING: flagged as suspicious - verify before using.] | 8.6.0 latest; created 2014-12-11; modified 2026-07-16 | Login and password reset abuse throttling | Use on public auth endpoints; seam flagged latest publish as too new. [CITED: https://express-rate-limit.mintlify.app/overview] |
| `react-router` [WARNING: flagged as suspicious - verify before using.] | 8.2.0 latest; created 2014-02-02; modified 2026-07-08 | Client routing for login/admin shell | Use for UX routing after human checkpoint; backend remains authoritative. [CITED: https://reactrouter.com/start/declarative/installation] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `argon2` | `bcrypt` | Bcrypt is acceptable when Argon2id is unavailable, but OWASP recommends Argon2id first. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] |
| Persisted refresh sessions | Stateless refresh JWT only | Stateless refresh tokens cannot support reliable current-session logout without a server-side revocation layer. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html] |
| `nodemailer` SMTP adapter | Provider-specific email SDK | SMTP avoids early vendor lock-in and keeps recovery email separate from prohibited communication modules. [CITED: https://nodemailer.com/smtp] |
| `react-router` | Local state-only view switching | Local state avoids a dependency but does not scale to authenticated admin surfaces and deep links. [ASSUMED] |

**Installation:**
```bash
npm install -w apps/api argon2 jose zod nodemailer express-rate-limit
npm install -w apps/web react-router
```

**Checkpoint requirement:** Planner must add `checkpoint:human-verify` before installing `nodemailer`, `express-rate-limit`, and `react-router` because the package-legitimacy seam returned `SUS` for the currently published versions. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `argon2` | npm | ~10.6 yrs | 1,591,996/wk | github.com/ranisalt/node-argon2 | OK | Approved. [VERIFIED: npm registry] |
| `jose` | npm | ~12.4 yrs | 89,942,023/wk | github.com/panva/jose | OK | Approved. [VERIFIED: npm registry] |
| `zod` | npm | ~6.4 yrs | 212,737,786/wk | github.com/colinhacks/zod | OK | Approved. [VERIFIED: npm registry] |
| `nodemailer` | npm | ~15.5 yrs | 16,591,188/wk | github.com/nodemailer/nodemailer | SUS | Flagged - planner must add checkpoint before install. [VERIFIED: npm registry] |
| `express-rate-limit` | npm | ~11.6 yrs | 44,849,381/wk | github.com/express-rate-limit/express-rate-limit | SUS | Flagged - planner must add checkpoint before install. [VERIFIED: npm registry] |
| `react-router` | npm | ~12.5 yrs | 46,440,652/wk | github.com/remix-run/react-router | SUS | Flagged - planner must add checkpoint before install. [VERIFIED: npm registry] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: npm registry]
**Packages flagged as suspicious [SUS]:** `nodemailer`, `express-rate-limit`, `react-router`. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Browser login/admin screens
  -> POST /auth/login, /auth/refresh, /auth/logout, /auth/password-reset/*
  -> Express public auth router
  -> Zod validation
  -> AuthService
       -> argon2 verify/hash
       -> jose sign/verify access JWT
       -> Prisma transaction for Session/PasswordReset/AuditLog
       -> optional EmailSender(SMTP) only for password reset
  -> Response: access token + refresh token/cookie contract

Browser protected admin screens
  -> Authorization header or refresh cookie contract
  -> requireAuth middleware
       -> verify JWT claims and active user/session context
       -> attach { userId, tenantId, sessionId, permissions }
  -> requirePermission("users.create" | ...)
       -> PermissionService merges role permissions + user overrides
       -> deny if missing or tenant mismatch
  -> Tenant-scoped services
       -> Prisma where: { tenantId, ... }
       -> AuditLog append for sensitive events
  -> JSON response

Bootstrap request
  -> /bootstrap/status or /bootstrap/create-first-admin
  -> if no tenant/admin exists: transaction creates Tenant + CompanySetting + User + admin Role + Permission grants + AuditLog
  -> if tenant/admin exists: 404/409 and no user creation
```

### Recommended Project Structure

```text
apps/api/src/
├── auth/              # token, password, reset, session services
├── tenancy/           # tenant context helpers and scoped Prisma access
├── permissions/       # permission constants, resolver and guards
├── audit/             # append-only audit writer and event builders
├── mail/              # password recovery email adapter only
├── http/middleware/   # requireAuth, requirePermission, csrf/origin checks
└── http/routes/       # bootstrap, auth, tenant settings, users, roles

apps/web/src/
├── api/               # auth/admin API clients
├── auth/              # auth state and token refresh client behavior
├── routes/            # login, protected shell, admin screens
└── design/            # existing formatters and shared visual conventions
```

### Pattern 1: Backend Auth Context

**What:** Verify access token, load active user/session, derive tenant ID and permissions, then attach a typed context to the request. [CITED: https://github.com/panva/jose]
**When to use:** Every protected API route after public health/bootstrap/auth routes. [VERIFIED: AGENTS.md]
**Example:**
```typescript
// Source: adapted from jose JWT verification docs.
import { jwtVerify } from "jose";

export async function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  const { payload } = await jwtVerify(token, accessTokenSecret, {
    issuer: "joia-api",
    audience: "joia-web",
  });

  req.auth = {
    userId: String(payload.sub),
    tenantId: String(payload.tenant_id),
    sessionId: String(payload.sid),
  };
  next();
}
```

### Pattern 2: Permission Resolution With Overrides

**What:** Compute effective permissions from role grants plus user overrides, with explicit deny winning over allow. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
**When to use:** Every permission-sensitive endpoint and every admin UI capability check. [VERIFIED: AGENTS.md]
**Example:**
```typescript
type PermissionOverride = { key: string; effect: "allow" | "deny" };

export function hasPermission(
  rolePermissions: Set<string>,
  overrides: PermissionOverride[],
  permission: string,
): boolean {
  const override = overrides.find((item) => item.key === permission);
  if (override?.effect === "deny") return false;
  if (override?.effect === "allow") return true;
  return rolePermissions.has(permission);
}
```

### Pattern 3: Tenant-Scoped Service Queries

**What:** Service functions accept authenticated context and put `tenantId` into every operational read/write filter. [VERIFIED: .planning/research/ARCHITECTURE.md]
**When to use:** Tenant, company setting, user, role, permission, session and audit queries. [VERIFIED: .planning/REQUIREMENTS.md]
**Example:**
```typescript
export async function listTenantUsers(ctx: AuthContext, prisma: PrismaDatabase) {
  return prisma.user.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });
}
```

### Pattern 4: Atomic Sensitive Writes

**What:** Use Prisma interactive transactions for multi-row auth and permission changes. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
**When to use:** Bootstrap, user creation with roles, permission override writes, refresh rotation, reset completion and password change. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
**Example:**
```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.update({ where: { id: userId, tenantId }, data: update });
  await tx.auditLog.create({ data: buildAudit(ctx, "user.updated", "User", user.id) });
  return user;
});
```

### Anti-Patterns to Avoid

- **Frontend-only authorization:** UI hiding is allowed for UX but never replaces API checks. [VERIFIED: AGENTS.md]
- **Storing raw refresh tokens or reset codes:** Store only hashes and audit metadata. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html]
- **Using email as a general communication module:** Phase 02 email is only password recovery. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
- **Generic `findUnique({ id })` on tenant data:** Tenant isolation requires tenant-aware filters or post-load tenant validation. [VERIFIED: .planning/research/ARCHITECTURE.md]
- **Prisma query extensions as the only tenant guard:** Prisma docs state query extensions do not support nested read/write operations. [CITED: https://www.prisma.io/docs/orm/prisma-client/client-extensions]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom salt/hash/KDF | `argon2` with Argon2id | Password hashing parameters and encoded hash formats are security-sensitive. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] |
| JWT signing/parsing | Manual base64/HMAC code | `jose` | JWT verification must enforce signature, issuer, audience and expiry. [CITED: https://github.com/panva/jose] |
| Input validation | Inline `typeof` checks everywhere | `zod` schemas at route boundaries | Auth/admin request bodies need consistent runtime validation. [CITED: https://zod.dev/] |
| Rate limiting | Per-process counters inside route handlers | `express-rate-limit` after checkpoint | Public login/reset endpoints need standardized throttling. [CITED: https://express-rate-limit.mintlify.app/overview] |
| SMTP delivery | Raw socket SMTP client | `nodemailer` after checkpoint | SMTP connection/auth handling should use a maintained transport library. [CITED: https://nodemailer.com/smtp] |
| Tenant isolation tests | Manual UI clicking | Vitest API integration tests with two tenants | Cross-tenant failures must be executable verification. [VERIFIED: .planning/ROADMAP.md] |

**Key insight:** Phase 02 creates the security foundation for every later module, so the planner should bias toward boring, explicit server-side services and tests over clever abstractions. [VERIFIED: .planning/ROADMAP.md]

## Common Pitfalls

### Pitfall 1: Bootstrap Route Stays Open
**What goes wrong:** Anyone can create another tenant/admin after setup. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
**Why it happens:** Bootstrap checks are implemented only in UI or dev seed logic. [ASSUMED]
**How to avoid:** Add backend `bootstrap/status` and atomic `bootstrap/create-first-admin` that fails when any tenant/admin already exists. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
**Warning signs:** Tests do not call bootstrap twice against a real database. [VERIFIED: .planning/ROADMAP.md]

### Pitfall 2: Role Permissions Ignore User Overrides
**What goes wrong:** IDT-04 is missed even though role assignment works. [VERIFIED: .planning/REQUIREMENTS.md]
**Why it happens:** The permission resolver only checks role permissions. [ASSUMED]
**How to avoid:** Store user-specific overrides and test allow and deny outcomes. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
**Warning signs:** UI has a permission matrix but no `UserPermissionOverride` model or API. [VERIFIED: .planning/REQUIREMENTS.md]

### Pitfall 3: Logout Cannot Revoke Current Session
**What goes wrong:** Logout only deletes a browser token or revokes all sessions for the user. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
**Why it happens:** Refresh tokens are stateless and not bound to a session row. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html]
**How to avoid:** Persist one `Session` per refresh token family and revoke by session ID. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
**Warning signs:** There is no `sessionId`/`jti` in the access token claims. [CITED: https://github.com/panva/jose]

### Pitfall 4: Tenant Filter Missing From Relationship Writes
**What goes wrong:** A user assigns a role, permission or setting from another tenant by ID. [VERIFIED: .planning/research/ARCHITECTURE.md]
**Why it happens:** The code validates only the target user but not related IDs. [ASSUMED]
**How to avoid:** Validate every related ID inside the authenticated tenant and use compound unique constraints where practical. [VERIFIED: .planning/research/ARCHITECTURE.md]
**Warning signs:** Tests cover list filtering but not cross-tenant updates. [VERIFIED: .planning/ROADMAP.md]

### Pitfall 5: Audit Logs Capture Secrets
**What goes wrong:** Passwords, reset codes or token strings land in logs/audit. [VERIFIED: AGENTS.md]
**Why it happens:** Generic request body logging or before/after snapshots are reused for auth events. [ASSUMED]
**How to avoid:** Build auth-specific audit payloads that log metadata, not secret values. [VERIFIED: AGENTS.md]
**Warning signs:** Audit tests only assert row creation, not absence of secrets. [VERIFIED: AGENTS.md]

### Pitfall 6: Cookie Storage Without CSRF Design
**What goes wrong:** Browser sends refresh cookies on unwanted cross-site requests. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html]
**Why it happens:** `httpOnly` cookies protect from script reads but do not fully solve CSRF. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html]
**How to avoid:** If refresh tokens use cookies, set `Secure`, `HttpOnly`, `SameSite`, and add Origin/Referer or CSRF token checks for state-changing auth endpoints. [CITED: https://expressjs.com/en/advanced/best-practice-security/]
**Warning signs:** Refresh/logout endpoints mutate state with cookies but no origin/CSRF check. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html]

## Code Examples

### Argon2id Hash And Verify
```typescript
// Source: adapted from OWASP Password Storage guidance and node-argon2 package docs.
import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Short-Lived Access JWT
```typescript
// Source: adapted from jose SignJWT/jwtVerify docs.
import { SignJWT, jwtVerify } from "jose";

const issuer = "joia-api";
const audience = "joia-web";

export function signAccessToken(secret: Uint8Array, claims: AuthClaims) {
  return new SignJWT({ tenant_id: claims.tenantId, sid: claims.sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime("15m")
    .sign(secret);
}

export function verifyAccessToken(secret: Uint8Array, token: string) {
  return jwtVerify(token, secret, { issuer, audience });
}
```

### Password Reset Code Handling
```typescript
// Source: adapted from OWASP password storage and REST sensitive-data guidance.
const resetCode = crypto.randomInt(100000, 1_000_000).toString();
const resetCodeHash = await hashOpaqueSecret(resetCode);

await prisma.passwordResetToken.create({
  data: {
    userId,
    codeHash: resetCodeHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  },
});
```

### Express Permission Guard
```typescript
// Source: existing Express router/middleware pattern in apps/api/src/app.ts.
export function requirePermission(permission: PermissionKey) {
  return async (req, res, next) => {
    if (!req.auth) return next(new HttpError(401, "Authentication required."));
    const allowed = await permissions.has(req.auth, permission);
    if (!allowed) return next(new HttpError(403, "Permission denied."));
    next();
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Long-lived bearer session tokens only | Short-lived access JWT plus persisted refresh session | Current OWASP guidance favors expiry plus revocation state for logout before expiry. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html] | Enables multi-session and current-session logout. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] |
| Bcrypt as default password choice | Argon2id where available | OWASP current Password Storage Cheat Sheet recommends Argon2id first. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] | Use `argon2` unless installation fails on target platform. [VERIFIED: npm registry] |
| Prisma middleware for cross-cutting behavior | Prisma Client query extensions plus explicit service guards | Prisma docs show client extensions and note nested operation limitations. [CITED: https://www.prisma.io/docs/orm/prisma-client/client-extensions] | Do not rely on extensions alone for tenant isolation. [CITED: https://www.prisma.io/docs/orm/prisma-client/client-extensions] |
| `react-router-dom` as default install | `react-router` official declarative install | React Router official docs instruct `npm i react-router` for declarative Vite-style apps. [CITED: https://reactrouter.com/start/declarative/installation] | Use `react-router` after checkpoint because latest package was flagged `SUS`. [VERIFIED: npm registry] |

**Deprecated/outdated:**
- Prisma `$use` middleware-only advice should not drive Phase 02 tenant design because current Prisma docs emphasize client extensions and document nested operation limitations. [CITED: https://www.prisma.io/docs/orm/prisma-client/client-extensions]
- Passwords must not be stored with reversible encryption or fast hashes. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html]
- Access or reset tokens must not be placed in URLs. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Local state-only view switching does not scale to authenticated admin surfaces and deep links. | Standard Stack / Alternatives | Planner might over-install routing when a simpler single-view UI is acceptable for Phase 02. |
| A2 | Bootstrap vulnerabilities usually come from UI/dev-only checks. | Common Pitfalls | Planner may miss another failure mode if tests cover only the assumed cause. |
| A3 | Role override bugs usually happen when resolver checks only role permissions. | Common Pitfalls | Planner may need broader permission resolver tests. |
| A4 | Cross-tenant relationship bugs usually happen when related IDs are not tenant-validated. | Common Pitfalls | Planner may need to enumerate every relation write explicitly. |
| A5 | Audit secret leaks usually come from generic body logging or broad snapshots. | Common Pitfalls | Planner may need route-specific logging tests even if audit code looks safe. |

## Open Questions

1. **Refresh token storage contract**
   - What we know: Multi-session is locked and logout invalidates only the current session. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
   - What's unclear: Whether refresh token is stored in an `HttpOnly` cookie or browser-managed memory/storage. [ASSUMED]
   - Recommendation: Planner should choose one explicitly; if cookie-based, include CSRF/origin checks. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html]

2. **Email provider for recovery**
   - What we know: Email is allowed only for auth recovery. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
   - What's unclear: Real SMTP credentials/provider are not present in `.env.example`. [VERIFIED: codebase grep]
   - Recommendation: Implement an SMTP adapter and a dev/test fake sender; planner should not require real email delivery for automated tests. [CITED: https://nodemailer.com/smtp]

3. **Admin permission namespace**
   - What we know: Phase 02 needs configurable permissions and user-specific overrides. [VERIFIED: .planning/REQUIREMENTS.md]
   - What's unclear: Exact permission key names are not locked. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md]
   - Recommendation: Use stable dot keys such as `tenant.settings.update`, `users.create`, `users.createAdmin`, `roles.manage`, and `permissions.manage`. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | API/web build and tests | yes | 22.14.0 | none needed. [VERIFIED: command output] |
| npm | Workspace package management | yes | 10.9.2 | none needed. [VERIFIED: command output] |
| Docker CLI | Docker Compose verification | yes | 29.6.1 CLI | Docker daemon was not reachable during `docker info`; planner should start Docker Desktop before smoke validation. [VERIFIED: command output] |
| PostgreSQL CLI `psql` | Optional manual DB inspection | no | unavailable | Use Docker service and Prisma tests. [VERIFIED: command output] |
| PostgreSQL service | API integration tests | configured | postgres:17-alpine in `compose.yaml` | Start with `docker compose up -d db`. [VERIFIED: codebase grep] |
| Vitest | Automated tests | yes | 4.1.10 installed | none needed. [VERIFIED: package.json] |
| SMTP provider | Password reset email | no configured provider | none | Use fake sender in tests and env-gated SMTP for dev/prod. [VERIFIED: .env.example] |

**Missing dependencies with no fallback:**
- Docker daemon was not reachable in this research run; integration/smoke verification requiring containers needs Docker Desktop running. [VERIFIED: command output]

**Missing dependencies with fallback:**
- `psql` is missing; Prisma and Docker health checks can validate DB behavior. [VERIFIED: command output]
- SMTP credentials are missing; tests should use a fake email sender and development can log/capture reset codes without customer communication features. [VERIFIED: .env.example]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10. [VERIFIED: package.json] |
| Config file | `apps/web/vite.config.ts`; no root Vitest config found. [VERIFIED: rg --files] |
| Quick run command | `npm run test -w apps/api -- auth` or targeted Vitest file once created. [VERIFIED: package.json] |
| Full suite command | `npm run verify`. [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| IDT-01 | Bootstrap creates tenant/settings/admin and locks after first run. | API integration | `npm run test -w apps/api -- auth-bootstrap` | no - Wave 0 |
| IDT-02 | Tenant admin can list/create/edit/deactivate users only in tenant. | API integration | `npm run test -w apps/api -- users` | no - Wave 0 |
| IDT-03 | Admin can create roles and assign permissions. | API integration | `npm run test -w apps/api -- permissions` | no - Wave 0 |
| IDT-04 | User-specific allow/deny overrides change effective permissions. | unit + API integration | `npm run test -w apps/api -- permissions` | no - Wave 0 |
| IDT-05 | Login verifies Argon2id password and rejects invalid credentials generically. | API integration | `npm run test -w apps/api -- auth-login` | no - Wave 0 |
| IDT-06 | Refresh rotates/validates active session securely. | API integration | `npm run test -w apps/api -- sessions` | no - Wave 0 |
| IDT-07 | Logout revokes only current session. | API integration | `npm run test -w apps/api -- sessions` | no - Wave 0 |
| IDT-08 | Password reset request and completion use registered email and code. | API integration | `npm run test -w apps/api -- password-reset` | no - Wave 0 |
| IDT-09 | Authenticated user can change password. | API integration | `npm run test -w apps/api -- password-change` | no - Wave 0 |
| IDT-10 | Missing/invalid auth blocks protected API routes. | API integration | `npm run test -w apps/api -- auth-guards` | no - Wave 0 |
| IDT-11 | Missing permission blocks protected actions. | API integration | `npm run test -w apps/api -- auth-guards` | no - Wave 0 |
| IDT-12 | Tenant A cannot read or mutate tenant B records. | API integration | `npm run test -w apps/api -- tenant-isolation` | no - Wave 0 |
| IDT-13 | Auth, permission and sensitive user-management events create sanitized audit rows. | API integration | `npm run test -w apps/api -- audit` | no - Wave 0 |

### Sampling Rate

- **Per task commit:** Run targeted API/web tests for touched auth/admin files plus `npm run typecheck --workspaces --if-present`. [VERIFIED: package.json]
- **Per wave merge:** Run `npm run verify`. [VERIFIED: package.json]
- **Phase gate:** `npm run verify`, `npm run db:migrate`, and Docker Compose smoke when Docker daemon is running. [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] `apps/api/src/test/auth-bootstrap.test.ts` - covers IDT-01. [VERIFIED: rg --files]
- [ ] `apps/api/src/test/auth-sessions.test.ts` - covers IDT-05, IDT-06, IDT-07, IDT-09, IDT-10. [VERIFIED: rg --files]
- [ ] `apps/api/src/test/permissions.test.ts` - covers IDT-03, IDT-04, IDT-11. [VERIFIED: rg --files]
- [ ] `apps/api/src/test/tenant-isolation.test.ts` - covers IDT-02, IDT-12. [VERIFIED: rg --files]
- [ ] `apps/api/src/test/audit.test.ts` - covers IDT-13 and secret redaction. [VERIFIED: rg --files]
- [ ] `apps/web/src/test/auth-ui.test.tsx` - covers login/admin menu UX without asserting backend authorization. [VERIFIED: rg --files]
- [ ] Test data helpers for creating tenants, users, sessions and permissions. [VERIFIED: codebase grep]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Argon2id password hashes, generic login errors, rate-limited auth endpoints, secure reset-code lifecycle. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] |
| V3 Session Management | yes | Short access token expiry, persisted refresh `Session`, rotation, current-session revocation and audit. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html] |
| V4 Access Control | yes | Backend `requireAuth`, `requirePermission`, tenant-scoped service filters and tests. [VERIFIED: AGENTS.md] |
| V5 Input Validation | yes | Zod schemas at route boundaries and REST-safe error responses. [CITED: https://zod.dev/] [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html] |
| V6 Cryptography | yes | `argon2` for passwords, Node `crypto` randomness for reset/refresh secrets, `jose` for signed JWTs; no custom crypto. [CITED: https://github.com/panva/jose] |
| V7 Error Handling and Logging | yes | Existing global error handler plus sanitized audit/security logs. [VERIFIED: codebase grep] |
| V10 Malicious Code | yes | Package legitimacy gate and no install of SLOP packages. [VERIFIED: npm registry] |

### Known Threat Patterns for Express/Prisma Auth

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential stuffing/brute force | Denial of Service / Spoofing | Rate limit login/reset by IP and username/email; generic errors. [CITED: https://expressjs.com/en/advanced/best-practice-security/] |
| Token theft/replay | Spoofing | Short access expiry, hashed refresh tokens, rotation, session revocation and audit. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html] |
| CSRF on cookie-backed refresh/logout | Tampering | `SameSite`, `Secure`, `HttpOnly`, no state-changing GETs, Origin/Referer or CSRF token checks. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html] |
| Cross-tenant data access | Information Disclosure / Elevation of Privilege | Tenant-scoped services, relationship validation and two-tenant integration tests. [VERIFIED: .planning/research/ARCHITECTURE.md] |
| Admin privilege escalation | Elevation of Privilege | `users.createAdmin`-style permission and explicit check before assigning admin-level roles. [VERIFIED: .planning/phases/02-autentica-o-tenant-e-permiss-es/02-CONTEXT.md] |
| Secret leakage in logs/audit | Information Disclosure | Never log passwords, full tokens, reset codes or secrets; assert absence in tests. [VERIFIED: AGENTS.md] |
| SQL injection | Tampering | Prisma parameterized query API; avoid raw SQL unless required and reviewed. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/crud] |

## Sources

### Primary (HIGH confidence)
- Local project files: `AGENTS.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `docs/VISUAL_CONTRACT.md`, `package.json`, `apps/api/src/app.ts`, `apps/api/src/http/errors.ts`, `apps/api/src/db/prisma.ts`, `prisma/schema.prisma`. [VERIFIED: codebase grep]
- npm registry and GSD package-legitimacy seam for `argon2`, `jose`, `zod`, `nodemailer`, `express-rate-limit`, `react-router`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Express security best practices: https://expressjs.com/en/advanced/best-practice-security/ [CITED: https://expressjs.com/en/advanced/best-practice-security/]
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html]
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html]
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html]
- Prisma transactions: https://www.prisma.io/docs/orm/prisma-client/queries/transactions [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Prisma Client extensions: https://www.prisma.io/docs/orm/prisma-client/client-extensions [CITED: https://www.prisma.io/docs/orm/prisma-client/client-extensions]
- jose official repository/docs: https://github.com/panva/jose [CITED: https://github.com/panva/jose]
- node-argon2 official repository/docs: https://github.com/ranisalt/node-argon2 [CITED: https://github.com/ranisalt/node-argon2]
- Zod docs: https://zod.dev/ [CITED: https://zod.dev/]
- Nodemailer docs: https://nodemailer.com/smtp [CITED: https://nodemailer.com/smtp]
- express-rate-limit docs: https://express-rate-limit.mintlify.app/overview [CITED: https://express-rate-limit.mintlify.app/overview]
- React Router docs: https://reactrouter.com/start/declarative/installation [CITED: https://reactrouter.com/start/declarative/installation]

### Tertiary (LOW confidence)
- Assumptions listed in the Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - package versions and legitimacy were checked, but three support packages require human checkpoints due recent latest publishes. [VERIFIED: npm registry]
- Architecture: HIGH - based on locked phase decisions, AGENTS.md constraints and existing code seams. [VERIFIED: codebase grep]
- Pitfalls: MEDIUM - major security pitfalls are cited from OWASP/Express/Prisma, while some root-cause explanations are assumptions. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html]

**Research date:** 2026-07-18
**Valid until:** 2026-07-25 for package/security package versions; 2026-08-17 for architecture and project constraints. [ASSUMED]
