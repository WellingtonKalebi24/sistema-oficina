# Phase 03: Clientes e Veiculos - Pattern Map

**Mapped:** 2026-07-20
**Files analyzed:** 19
**Analogs found:** 19 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | model | CRUD | `prisma/schema.prisma` tenant/user/role models | role-match |
| `prisma/migrations/*/migration.sql` | migration | CRUD | `prisma/migrations/20260719114626_add_identity_tenant_permissions/migration.sql` | role-match |
| `prisma/seed.ts` | utility | CRUD | `prisma/seed.ts` permission seed | role-match |
| `apps/api/src/permissions/permissions.ts` | utility | transform | `apps/api/src/permissions/permissions.ts` | exact |
| `apps/api/src/tenancy/tenantScope.ts` | utility | CRUD | `apps/api/src/tenancy/tenantScope.ts` | exact |
| `apps/api/src/http/routes/customers.ts` | route | CRUD/request-response | `apps/api/src/http/routes/users.ts` | exact |
| `apps/api/src/http/routes/vehicles.ts` | route | CRUD/request-response | `apps/api/src/http/routes/users.ts` | exact |
| `apps/api/src/http/routes/customerVehicleHistory.ts` | route | CRUD/request-response | `apps/api/src/http/routes/roles.ts` | role-match |
| `apps/api/src/app.ts` | config | request-response | `apps/api/src/app.ts` protected admin mount | exact |
| `apps/api/src/test/customer-vehicles.test.ts` | test | CRUD/request-response | `apps/api/src/test/permissions.test.ts` | exact |
| `apps/api/src/test/customer-vehicle-isolation.test.ts` | test | CRUD/request-response | `apps/api/src/test/tenant-isolation.test.ts` | exact |
| `apps/api/src/test/customer-vehicle-audit.test.ts` | test | event-driven | `apps/api/src/test/audit.test.ts` | role-match |
| `apps/api/src/test/testData.ts` | utility | CRUD | `apps/api/src/test/testData.ts` | exact |
| `apps/api/src/test/prisma-baseline.test.ts` | test | schema/CRUD | `apps/api/src/test/prisma-baseline.test.ts` | role-match |
| `apps/web/src/api/customers.ts` | utility | request-response | `apps/web/src/api/admin.ts` | exact |
| `apps/web/src/api/vehicles.ts` | utility | request-response | `apps/web/src/api/admin.ts` | exact |
| `apps/web/src/App.tsx` | component | request-response/event-driven | `apps/web/src/App.tsx` admin shell/panels | exact |
| `apps/web/src/styles.css` | component | UI states | `apps/web/src/styles.css` | exact |
| `apps/web/src/test/customer-vehicle-ui.test.tsx` | test | request-response | `apps/web/src/test/auth-ui.test.tsx` | exact |

## Pattern Assignments

### `prisma/schema.prisma` (model, CRUD)

**Analog:** `prisma/schema.prisma`

**Tenant-owned model pattern** (lines 19-34):
```prisma
model Tenant {
  id        String    @id @default(cuid())
  name      String
  document  String?   @unique
  status    String    @default("active")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  settings  CompanySetting?
  users     User[]
  roles     Role[]
  sessions  Session[]
  auditLogs AuditLog[]

  @@index([status])
  @@map("tenants")
}
```

**Tenant unique/index pattern** (lines 54-76):
```prisma
model User {
  id            String    @id @default(cuid())
  tenantId      String    @map("tenant_id")
  name          String
  email         String
  passwordHash  String    @map("password_hash")
  status        String    @default("active")
  deactivatedAt DateTime? @map("deactivated_at")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, email])
  @@index([tenantId, status])
  @@index([email])
  @@map("users")
}
```

**Apply to Phase 3:** add `Customer` and `Vehicle` with `tenantId`, `status`, `deletedAt`/soft-delete timestamp, `createdAt`, `updatedAt`, `@map` snake_case columns, `@@map` plural snake_case tables, and tenant-scoped uniqueness. Use `@@unique([tenantId, document])` or nullable-safe alternatives for customer document if configured, `@@unique([tenantId, plate])` for vehicles, and indexes for search fields (`tenantId,status`, `tenantId,name`, `tenantId,phone`, `tenantId,plate`, `tenantId,customerId`). Add relations from `Tenant` to customers/vehicles and from `Customer` to vehicles.

---

### `prisma/migrations/*/migration.sql` (migration, CRUD)

**Analog:** existing Prisma migrations under `prisma/migrations`.

**Pattern:** generate with Prisma migration tooling; do not hand-apply ad hoc SQL. The planner should require a clean migration plus `prisma-baseline.test.ts` assertions that Phase 3 models exist and forbidden communication models remain absent.

---

### `prisma/seed.ts` (utility, CRUD)

**Analog:** `prisma/seed.ts`

**Permission seed import and catalog pattern** (lines 6-36):
```typescript
import { ALL_PERMISSIONS, PERMISSION_DETAILS } from "../apps/api/src/permissions/permissions.js";

export const IDENTITY_PERMISSION_SEED = [
  ...ALL_PERMISSIONS.map((permissionKey) => ({
    description: PERMISSION_DETAILS[permissionKey].description,
    key: permissionKey,
    name: PERMISSION_DETAILS[permissionKey].name,
  })),
] as const;
```

**Idempotent upsert pattern** (lines 64-80):
```typescript
export async function seedIdentityPermissions(prisma: FoundationCheckWriter): Promise<void> {
  if (!prisma.permission) {
    return;
  }

  for (const permission of IDENTITY_PERMISSION_SEED) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: permission,
      update: {
        name: permission.name,
        description: permission.description,
      },
    });
  }
}
```

**Apply to Phase 3:** add customer/vehicle permission keys to `PERMISSIONS`, `ALL_PERMISSIONS`, `PERMISSION_DETAILS`, then let the existing permission seed pick them up. Update default roles intentionally; do not seed customer/vehicle business records unless a deterministic dev fixture is explicitly planned.

---

### `apps/api/src/permissions/permissions.ts` (utility, transform)

**Analog:** `apps/api/src/permissions/permissions.ts`

**Stable permission namespace pattern** (lines 1-27):
```typescript
export const PERMISSIONS = {
  auditRead: "audit.read",
  permissionsManage: "permissions.manage",
  rolesManage: "roles.manage",
  tenantSettingsRead: "tenant.settings.read",
  tenantSettingsUpdate: "tenant.settings.update",
  usersCreate: "users.create",
  usersCreateAdmin: "users.createAdmin",
  usersDeactivate: "users.deactivate",
  usersRead: "users.read",
  usersUpdate: "users.update",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.tenantSettingsRead,
  PERMISSIONS.tenantSettingsUpdate,
  PERMISSIONS.usersRead,
  PERMISSIONS.usersCreate,
  PERMISSIONS.usersUpdate,
  PERMISSIONS.usersDeactivate,
  PERMISSIONS.usersCreateAdmin,
  PERMISSIONS.rolesManage,
  PERMISSIONS.permissionsManage,
  PERMISSIONS.auditRead,
];
```

**Details and validation pattern** (lines 36-90):
```typescript
export const PERMISSION_DETAILS: Record<PermissionKey, { description: string; name: string }> = {
  [PERMISSIONS.usersRead]: {
    description: "Permite consultar usuarios do tenant autenticado.",
    name: "Listar usuarios",
  },
};

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value);
}
```

**Apply to Phase 3:** add granular keys such as `customers.read`, `customers.create`, `customers.update`, `customers.delete`, `vehicles.read`, `vehicles.create`, `vehicles.update`, `vehicles.delete`, and possibly `customerVehicles.history.read`. Do not classify normal customer/vehicle CRUD as admin-level unless product explicitly requires it.

---

### `apps/api/src/http/routes/customers.ts` (route, CRUD/request-response)

**Analog:** `apps/api/src/http/routes/users.ts`

**Imports, Zod, auth, permission and tenant scope pattern** (lines 1-21):
```typescript
import { Router, type Request } from "express";
import { z } from "zod";

import { writeAuditLog } from "../../audit/auditService.js";
import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import { asyncHandler, badRequest } from "../errors.js";
import { requirePermission } from "../middleware/requirePermission.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
```

**List pattern: permission gate + tenant filter + serializer** (lines 57-85):
```typescript
router.get(
  "/users",
  requirePermission(prisma, PERMISSIONS.usersRead),
  asyncHandler(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      where: {
        tenantId: auth.tenantId,
      },
    });

    res.json({
      data: users.map(serializeUser),
    });
  }),
);
```

**Create pattern: Zod safeParse + transaction + audit** (lines 89-159):
```typescript
router.post(
  "/users",
  requirePermission(prisma, PERMISSIONS.usersCreate),
  asyncHandler(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const parsed = createUserSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest("Invalid user data.");
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          tenantId: auth.tenantId,
        },
      });

      await writeAuditLog(tx as PrismaDatabase, {
        action: "users.created",
        entity: "user",
        ipAddress: req.ip,
        recordId: created.id,
        tenantId: auth.tenantId,
        userAgent: req.get("user-agent"),
        userId: auth.userId,
      });

      return created;
    });

    res.status(201).json({ data: serializeUser(user) });
  }),
);
```

**Update and soft-delete pattern** (lines 163-260):
```typescript
router.patch(
  "/users/:userId",
  requirePermission(prisma, PERMISSIONS.usersUpdate),
  asyncHandler(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    const parsed = updateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest("Invalid user data.");
    }

    const userId = readPathParam(req, "userId");
    await requireTenantUser(prisma, auth.tenantId, userId);

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        data: updateData,
        where: { id: userId },
      });

      await writeAuditLog(tx as PrismaDatabase, {
        action: "users.updated",
        entity: "user",
        metadata: { fields: Object.keys(parsed.data).sort() },
        recordId: updated.id,
        tenantId: auth.tenantId,
        userId: auth.userId,
      });

      return updated;
    });

    res.json({ data: serializeUser(user) });
  }),
);
```

**Apply to Phase 3:** copy this router factory style for `/customers`: Zod schemas at top, `createCustomersRouter(prisma)`, `requirePermission` per route, `auth.tenantId` as the only tenant source, `findMany` search filters inside tenant scope, `PATCH` for edits, and a soft-delete action that sets `deletedAt`/`status` rather than deleting rows.

---

### `apps/api/src/http/routes/vehicles.ts` (route, CRUD/request-response)

**Analog:** `apps/api/src/http/routes/users.ts` plus `apps/api/src/tenancy/tenantScope.ts`

**Relationship validation analog** (tenant role IDs, lines 33-58):
```typescript
export async function requireTenantRoleIds(
  prisma: PrismaDatabase,
  tenantId: string,
  roleIds: string[],
): Promise<void> {
  const uniqueRoleIds = [...new Set(roleIds)];

  const roles = await prisma.role.findMany({
    select: { id: true },
    where: {
      id: { in: uniqueRoleIds },
      tenantId,
    },
  });

  if (roles.length !== uniqueRoleIds.length) {
    throw badRequest("All role IDs must belong to the authenticated tenant.");
  }
}
```

**Path param pattern** (users route lines 379-387):
```typescript
function readPathParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== "string" || !value) {
    throw badRequest("Missing route parameter.");
  }

  return value;
}
```

**Apply to Phase 3:** create `requireTenantCustomer(prisma, tenantId, customerId)` and optionally `requireTenantVehicle(prisma, tenantId, vehicleId)` in `tenantScope.ts`. Vehicle create/update must validate `customerId` belongs to `auth.tenantId` before linking. Cross-tenant customer IDs should fail with `400` for invalid relationship IDs or `404` for direct record lookup, matching current semantics.

---

### `apps/api/src/app.ts` (config, request-response)

**Analog:** `apps/api/src/app.ts`

**Protected router mount pattern** (lines 50-72):
```typescript
app.use(createHealthRouter(prisma));
app.use(createBootstrapRouter(prisma));
app.use(createAuthRouter(prisma, env, emailSender));
app.use(createFoundationChecksRouter(prisma));

app.use(
  requireAuth(prisma, {
    audience: env.jwtAudience,
    issuer: env.jwtIssuer,
    secret: env.jwtAccessSecret,
  }),
);
app.use(createTenantSettingsRouter(prisma));
app.use(createUsersRouter(prisma));
app.use(createRolesRouter(prisma));

app.use(createErrorHandler(logger));
```

**Apply to Phase 3:** import and mount `createCustomersRouter(prisma)` and `createVehiclesRouter(prisma)` after the shared `requireAuth` gate and before `createErrorHandler(logger)`. Do not mount customer/vehicle routes publicly.

---

### `apps/api/src/audit/auditService.ts` (service, event-driven)

**Analog:** `apps/api/src/audit/auditService.ts`

**Audit write and sanitizer pattern** (lines 5-33):
```typescript
const SENSITIVE_KEY_PATTERN = /password|token|code|hash|secret/i;

export type AuditLogInput = {
  action: string;
  entity: string;
  ipAddress?: string | undefined;
  metadata?: AuditMetadata;
  recordId?: string | null;
  tenantId?: string | null;
  userAgent?: string | undefined;
  userId?: string | null;
};

export async function writeAuditLog(prisma: PrismaDatabase, input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entity: input.entity,
      ipAddress: input.ipAddress ?? null,
      payload: sanitizeAuditMetadata(input.metadata ?? {}) as Prisma.InputJsonValue,
      recordId: input.recordId ?? null,
      tenantId: input.tenantId ?? null,
      userAgent: input.userAgent ?? null,
      userId: input.userId ?? null,
    },
  });
}
```

**Apply to Phase 3:** write audit rows inside the same Prisma transaction for `customers.created`, `customers.updated`, `customers.deleted`, `vehicles.created`, `vehicles.updated`, `vehicles.deleted`, and link/history-sensitive changes. Metadata should include field names, duplicate-detection reason, plate/document values only if acceptable for audit, and never secrets.

---

### `apps/api/src/test/*.test.ts` (test, CRUD/request-response/event-driven)

**Analog:** `apps/api/src/test/permissions.test.ts`

**Shared PostgreSQL app setup** (lines 1-59):
```typescript
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://joia:joia_dev_password@localhost:55432/joia_dev?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

beforeAll(async () => {
  process.env.DATABASE_URL = connectionString;

  server = createServer(
    createApp({
      logStream,
      prisma,
    }),
  );

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
});

beforeEach(async () => {
  await resetIdentityTables(prisma);
});
```

**Authorized request and audit assertion pattern** (lines 80-190):
```typescript
const fixture = await createTenantWithAdmin(prisma);
const adminSession = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
const authHeaders = {
  authorization: `Bearer ${adminSession.accessToken}`,
  "content-type": "application/json",
};

const createUserResponse = await fetch(`${baseUrl}/users`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    email: "mecanico@permissoes.test",
    name: "Mecanico Permissoes",
    password: "Senha-mecanico-123",
  }),
});

expect(createUserResponse.status).toBe(201);
const auditActions = (await getAuditRows(prisma)).map((row) => row.action);
expect(auditActions).toEqual(expect.arrayContaining(["users.created"]));
```

**Tenant isolation pattern** (`tenant-isolation.test.ts` lines 71-164):
```typescript
const tenantA = await createTenantWithAdmin(prisma, { tenantName: "Oficina A" });
const tenantB = await createTenantWithAdmin(prisma, { tenantName: "Oficina B" });
const sessionA = await loginAs({ baseUrl }, tenantA.adminEmail, tenantA.adminPassword);
const headersA = {
  authorization: `Bearer ${sessionA.accessToken}`,
  "content-type": "application/json",
};

const listUsersAResponse = await fetch(`${baseUrl}/users`, {
  headers: { authorization: `Bearer ${sessionA.accessToken}` },
});

expect(listUsersAResponse.status).toBe(200);
expect(usersBody.data.map((user) => user.email)).not.toContain(tenantB.adminEmail);

const patchTenantBUserResponse = await fetch(`${baseUrl}/users/${tenantB.adminId}`, {
  method: "PATCH",
  headers: headersA,
  body: JSON.stringify({ name: "Cross Tenant" }),
});

expect(patchTenantBUserResponse.status).toBe(404);
```

**Apply to Phase 3:** add tests for customer CRUD, vehicle CRUD, search by name/phone/document/plate/related customer, duplicate blocking, soft delete preserving related rows, audit rows, and tenant A unable to list/read/update/delete/link tenant B customer/vehicle data.

---

### `apps/api/src/test/testData.ts` (utility, CRUD)

**Analog:** `apps/api/src/test/testData.ts`

**Cleanup order pattern** (lines 78-92):
```typescript
export async function resetIdentityTables(prisma: PrismaClient): Promise<void> {
  const db = prisma as IdentityPrisma;

  await db.passwordResetToken.deleteMany();
  await db.session.deleteMany();
  await db.auditLog.deleteMany();
  await db.userPermissionOverride.deleteMany();
  await db.userRole.deleteMany();
  await db.rolePermission.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();
  await db.user.deleteMany();
  await db.companySetting.deleteMany();
  await db.tenant.deleteMany();
}
```

**Tenant admin fixture pattern** (lines 94-167):
```typescript
export async function createTenantWithAdmin(
  prisma: PrismaClient,
  overrides: Partial<{ tenantName: string; document: string; email: string }> = {},
): Promise<TenantWithAdminFixture> {
  const suffix = crypto.randomUUID();
  const tenant = await db.tenant.create({
    data: {
      name: overrides.tenantName ?? `Oficina ${suffix}`,
      document: overrides.document ?? `tenant-${suffix}`,
      status: "active",
      settings: {
        create: {
          tradeName: overrides.tenantName ?? `Oficina ${suffix}`,
          timezone: "America/Sao_Paulo",
          locale: "pt-BR",
        },
      },
    },
  });

  await seedPermissionRows(prisma);
  // create admin role and user...
}
```

**Apply to Phase 3:** extend cleanup to delete `vehicle` and `customer` rows before tenant deletion. Add `createCustomerFixture` and `createVehicleFixture` helpers that always require `tenantId` and generate unique document/plate values with `crypto.randomUUID()`.

---

### `apps/api/src/test/prisma-baseline.test.ts` (test, schema/CRUD)

**Analog:** `apps/api/src/test/prisma-baseline.test.ts`

**Schema contract pattern** (lines 63-85):
```typescript
describe("Prisma schema baseline", () => {
  it("contains the Phase 2 identity, tenant, session, permission and audit contract", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toMatch(/model\s+FoundationCheck\b/);

    for (const model of requiredIdentityModels) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\b`));
    }
  });

  it("keeps out-of-scope business and communication entities out of the schema", async () => {
    const schema = await readFile(schemaPath, "utf8");

    for (const model of forbiddenBusinessOrCommunicationModels) {
      expect(schema).not.toMatch(new RegExp(`model\\s+${model}\\b`, "i"));
    }
  });
});
```

**Apply to Phase 3:** move `Customer` and `Vehicle` out of forbidden business models and into a Phase 3 required model list. Keep `Notification`, `MessageQueue`, WhatsApp, email integration and communication entities forbidden.

---

### `apps/web/src/api/customers.ts` and `apps/web/src/api/vehicles.ts` (utility, request-response)

**Analog:** `apps/web/src/api/admin.ts`

**Typed local API envelope and DTO pattern** (lines 1-56):
```typescript
import { ApiError } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  data: T;
};

export type AdminUser = {
  createdAt: string;
  deactivatedAt: string | null;
  email: string;
  id: string;
  name: string;
  status: string;
  tenantId: string;
  updatedAt: string;
};
```

**Bearer request pattern** (lines 123-150):
```typescript
async function request<T>(
  path: string,
  accessToken: string,
  options: { body?: unknown; method?: string } = {},
): Promise<T> {
  const init: RequestInit = {
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${accessToken}`,
    },
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new ApiError(response.status, toErrorMessage(response.status));
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}
```

**Apply to Phase 3:** create typed clients with local DTOs for customer, vehicle, create/update inputs, list filters/search params, and history rows. Reuse `ApiError` so `401/403` handling remains consistent in `App.tsx`.

---

### `apps/web/src/auth/session.ts` (provider/store, event-driven)

**Analog:** `apps/web/src/auth/session.ts`

**Session persistence and permission predicate** (lines 14-55):
```typescript
export function readStoredSession(): StoredSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;

    if (!parsed.accessToken || !parsed.refreshToken || !parsed.sessionId || !parsed.user) {
      clearStoredSession();
      return null;
    }

    return parsed;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function hasPermission(session: StoredSession | null, permission: string): boolean {
  return Boolean(session?.permissions.includes(permission));
}
```

**Apply to Phase 3:** gate menu visibility for customer/vehicle panels with `hasPermission`, but keep backend 403 as authoritative. Do not store customer/vehicle records in localStorage.

---

### `apps/web/src/App.tsx` (component, request-response/event-driven)

**Analog:** `apps/web/src/App.tsx`

**Boot/load state and 403 blocked pattern** (lines 69-183):
```tsx
const [session, setSession] = useState<StoredSession | null>(() => readStoredSession());
const [adminData, setAdminData] = useState<AdminData>(initialAdminData);
const [blocked, setBlocked] = useState<BlockedState>({});

async function loadResource<T>(
  key: keyof BlockedState,
  action: () => Promise<T>,
  apply: (value: T) => void,
) {
  try {
    apply(await action());
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      setBlocked((current) => ({
        ...current,
        [key]: "Acesso bloqueado pela permissao do servidor.",
      }));
      return;
    }

    setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar dados.");
  }
}
```

**Permission-aware menu and panel switch pattern** (lines 608-690):
```tsx
const menuItems = useMemo(
  () =>
    [
      { label: "Oficina", permission: "tenant.settings.read", view: "oficina" as const },
      { label: "Usuarios", permission: "users.read", view: "usuarios" as const },
      { label: "Papeis", permission: "roles.manage", view: "papeis" as const },
      { label: "Permissoes", permission: "permissions.manage", view: "permissoes" as const },
    ].filter((item) => hasPermission(props.session, item.permission)),
  [props.session],
);

<nav className="nav-list" aria-label="Administracao">
  {menuItems.map((item) => (
    <button
      key={item.view}
      type="button"
      className={props.activeView === item.view ? "nav-item nav-item--active" : "nav-item"}
      onClick={() => props.onSelectView(item.view)}
    >
      {item.label}
    </button>
  ))}
</nav>
```

**Form + table panel pattern** (lines 784-860):
```tsx
<section className="workspace-grid" aria-label="Administracao de usuarios">
  <form className="panel action-panel" aria-label="Criar usuario" onSubmit={...}>
    <div className="panel-heading">
      <div>
        <p className="eyebrow">Usuarios</p>
        <h2>Novo usuario</h2>
      </div>
      <span className="pill">Tenant</span>
    </div>
    <label className="field">
      <span>Nome do usuario</span>
      <input value={name} onChange={(event) => setName(event.target.value)} />
    </label>
    <button type="submit">Criar usuario</button>
  </form>
  <section className="panel">
    <div className="table-wrap">
      <table aria-label="Usuarios cadastrados">
        <thead>...</thead>
        <tbody>{users.map((user) => <tr key={user.id}>...</tr>)}</tbody>
      </table>
    </div>
  </section>
</section>
```

**Apply to Phase 3:** add `clientes` and `veiculos` views to the existing admin shell, not a separate landing page. Customer/vehicle panels should be dense operational forms, filters/search, tables, status badges, blocked states, and history sections. Use Portuguese labels and no automatic communication/WhatsApp/email/send language.

---

### `apps/web/src/styles.css` (component styling, UI states)

**Analog:** `apps/web/src/styles.css`

**Design tokens** (lines 1-31):
```css
:root {
  --color-bg: #f4f7f6;
  --color-surface: #ffffff;
  --color-surface-muted: #eef3f1;
  --color-text: #18211f;
  --color-muted: #5b6b66;
  --color-line: #d5dfdc;
  --color-primary: #176b5b;
  --color-accent: #c58b2f;
  --color-danger: #b4343a;
  --color-success: #237348;
  --radius-panel: 8px;
  --radius-control: 6px;
}
```

**Panel/form/table/state pattern** (lines 145-225 and 383-428):
```css
.panel {
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-panel);
}

.field {
  display: grid;
  gap: var(--space-2);
  font-size: 0.9rem;
  font-weight: 700;
}

input,
select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
  font-size: 0.88rem;
}

.empty-state {
  display: grid;
  min-height: 112px;
  place-content: center;
  border: 1px dashed var(--color-line);
}
```

**Apply to Phase 3:** reuse existing utility classes and add only scoped classes when needed for customer/vehicle filters or history. Keep radii at 8px or less and table-first operational density.

---

### `apps/web/src/test/customer-vehicle-ui.test.tsx` (test, request-response)

**Analog:** `apps/web/src/test/auth-ui.test.tsx`

**JSDOM cleanup and fetch mock pattern** (lines 1-18 and 231-248):
```typescript
// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function createFetchMock(routes: MockRoute[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const pathname = new URL(typeof input === "string" ? input : input.toString()).pathname;
    const found = routes.find((item) => item.method === (init?.method ?? "GET") && item.pathname === pathname);
    if (!found) {
      throw new Error(`Unexpected fetch ${init?.method ?? "GET"} ${pathname}`);
    }
    return jsonResponse(found.body, found.status);
  });
}
```

**Accessible table/admin assertions** (lines 108-138):
```typescript
render(<App />);
await login();

fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
const usersTable = await screen.findByRole("table", { name: "Usuarios cadastrados" });
expect(within(usersTable).getByText("Admin Joia")).toBeInTheDocument();
expect(screen.getByLabelText("Criar usuario")).toBeInTheDocument();

const text = document.body.textContent ?? "";
expect(text).not.toMatch(/whatsapp|sms|notificacao|campanha|mensagem|disparo/i);
expect(screen.queryByText(/compre agora|plano|landing/i)).not.toBeInTheDocument();
```

**Apply to Phase 3:** mock `/customers`, `/vehicles`, search query paths, create/update/delete responses, and backend 403. Assert accessible tables/forms, customer-vehicle linking, search results, soft-delete state, history panel, and absence of prohibited communication language.

## Shared Patterns

### Backend Authorization
**Source:** `apps/api/src/http/middleware/requireAuth.ts` lines 20-30 and `apps/api/src/http/middleware/requirePermission.ts` lines 9-22  
**Apply to:** all customer/vehicle routes
```typescript
app.use(requireAuth(prisma, { audience, issuer, secret }));

router.get(
  "/customers",
  requirePermission(prisma, PERMISSIONS.customersRead),
  asyncHandler(async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    // tenant-scoped query
  }),
);
```

### Tenant Isolation
**Source:** `apps/api/src/http/routes/users.ts` lines 61-80 and `apps/api/src/tenancy/tenantScope.ts` lines 19-30  
**Apply to:** customer list/read/update/delete, vehicle list/read/update/delete/link
```typescript
const auth = (req as AuthenticatedRequest).auth;
const rows = await prisma.customer.findMany({
  where: {
    tenantId: auth.tenantId,
  },
});
```

### Zod Validation
**Source:** `apps/api/src/http/routes/users.ts` lines 23-52 and 94-98  
**Apply to:** all create/update/filter payloads
```typescript
const parsed = createUserSchema.safeParse(req.body);

if (!parsed.success) {
  throw badRequest("Invalid user data.");
}
```

### Transactions And Audit
**Source:** `apps/api/src/http/routes/tenantSettings.ts` lines 55-80 and `apps/api/src/audit/auditService.ts` lines 20-33  
**Apply to:** customer/vehicle creates, updates, soft deletes, link changes
```typescript
const result = await prisma.$transaction(async (tx) => {
  const updated = await tx.customer.update({ data, where: { id } });
  await writeAuditLog(tx as PrismaDatabase, {
    action: "customers.updated",
    entity: "customer",
    recordId: updated.id,
    tenantId: auth.tenantId,
    userId: auth.userId,
  });
  return updated;
});
```

### API Error Shape
**Source:** `apps/api/src/http/errors.ts` lines 14-24 and 34-51  
**Apply to:** route validation, missing/cross-tenant records, duplicate conflicts
```typescript
export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

if (error instanceof HttpError) {
  res.status(error.statusCode).json({
    status: "error",
    message: error.message,
  });
  return;
}
```

### Typed Web Clients
**Source:** `apps/web/src/api/admin.ts` lines 123-150  
**Apply to:** `apps/web/src/api/customers.ts`, `apps/web/src/api/vehicles.ts`
```typescript
const response = await fetch(`${API_BASE_URL}${path}`, init);

if (!response.ok) {
  throw new ApiError(response.status, toErrorMessage(response.status));
}

const payload = (await response.json()) as ApiEnvelope<T>;
return payload.data;
```

### Admin Shell Panels
**Source:** `apps/web/src/App.tsx` lines 608-690 and 784-860  
**Apply to:** customer/vehicle menu entries and panels
```tsx
{ label: "Clientes", permission: "customers.read", view: "clientes" as const }
{ label: "Veiculos", permission: "vehicles.read", view: "veiculos" as const }
```

### API Integration Tests
**Source:** `apps/api/src/test/permissions.test.ts` lines 18-59 and `apps/api/src/test/tenant-isolation.test.ts` lines 71-164  
**Apply to:** Phase 3 API test files
```typescript
const fixture = await createTenantWithAdmin(prisma);
const session = await loginAs({ baseUrl }, fixture.adminEmail, fixture.adminPassword);
const headers = {
  authorization: `Bearer ${session.accessToken}`,
  "content-type": "application/json",
};
```

### UI Tests
**Source:** `apps/web/src/test/auth-ui.test.tsx` lines 1-18 and 231-248  
**Apply to:** Phase 3 UI tests
```typescript
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  vi.restoreAllMocks();
});
```

## No Analog Found

All requested Phase 3 implementation areas have a usable local analog. There is no existing customer/vehicle domain model yet, so domain-specific duplicate rules and history shape must come from Phase 3 requirements, but the implementation mechanics have exact or role-match patterns.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | - | - | Local Phase 2 auth/admin patterns cover the needed model, route, permission, audit, test, client and UI conventions. |

## Metadata

**Analog search scope:** `AGENTS.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, Phase 2 pattern/summaries, `prisma`, `apps/api/src`, `apps/web/src`, API/web tests  
**Files scanned:** 46 source/planning files discovered with `rg --files` plus mandated planning artifacts  
**Pattern extraction date:** 2026-07-20  
**Project instructions:** Backend authorization is mandatory, all operational records must be tenant-scoped, customer/vehicle changes require audit, communication automation remains prohibited, and phase completion requires executable verification.  
**Project skills:** `.codex/skills` contains GSD workflow skills; no project-domain skill rules were found in `AGENTS.md`.
