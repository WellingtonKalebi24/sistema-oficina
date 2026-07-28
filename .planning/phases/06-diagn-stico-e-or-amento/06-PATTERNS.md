# Phase 6: Diagnostico e Orcamento - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 16
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | model | CRUD | `prisma/schema.prisma` existing customer/vehicle/reception/stock models | role-match |
| `prisma/migrations/*_add_quotes/migration.sql` | migration | CRUD | `prisma/migrations/20260724100000_add_reception_checkins/migration.sql`, `20260722133000_add_stock_reservations/migration.sql` | role-match |
| `apps/api/package.json` | config | dependency | `apps/api/package.json` | exact |
| `apps/api/src/permissions/permissions.ts` | config | request-response | `apps/api/src/permissions/permissions.ts` stock/reception permissions | exact |
| `prisma/seed.ts` | config | batch | `prisma/seed.ts` permission seed | exact |
| `apps/api/src/quotes/quoteSchemas.ts` | utility | transform | `apps/api/src/stock/stockSchemas.ts` | exact |
| `apps/api/src/quotes/quoteCalculator.ts` | utility | transform | `apps/api/src/stock/stockSchemas.ts` decimal normalization | partial |
| `apps/api/src/quotes/quoteService.ts` | service | CRUD | `apps/api/src/reception/checkInService.ts`, `apps/api/src/stock/stockService.ts` | exact |
| `apps/api/src/quotes/quotePdf.ts` | service | streaming | none | no-analog |
| `apps/api/src/http/routes/quotes.ts` | route | request-response + streaming | `apps/api/src/http/routes/reception.ts`, `apps/api/src/http/routes/stockMovements.ts` | exact |
| `apps/api/src/app.ts` | config | request-response | `apps/api/src/app.ts` route mounting | exact |
| `apps/web/src/api/quotes.ts` | utility | request-response + file-I/O | `apps/web/src/api/stock.ts`, `apps/web/src/api/reception.ts` | role-match |
| `apps/web/src/App.tsx` | component | event-driven | `apps/web/src/App.tsx` Agenda/Estoque operational workspaces | exact |
| `apps/api/src/test/quote-contract.test.ts` | test | request-response | `apps/api/src/test/reception-contract.test.ts`, `apps/api/src/test/stock-contract.test.ts` | exact |
| `apps/api/src/test/quote-versioning.test.ts` | test | CRUD | `apps/api/src/test/stock-contract.test.ts` reservation/source snapshot assertions | role-match |
| `apps/api/src/test/quote-pdf.test.ts`, `apps/web/src/test/quote-ui.test.tsx` | test | streaming / event-driven | `apps/web/src/test/reception-ui.test.tsx` | role-match |

## Pattern Assignments

### `prisma/schema.prisma` (model, CRUD)

**Analog:** existing tenant-scoped operational models in `prisma/schema.prisma`

**Tenant relation/index pattern** (lines 557-587):
```prisma
model ReceptionCheckIn {
  id              String    @id @default(cuid())
  tenantId        String    @map("tenant_id")
  appointmentId   String    @unique @map("appointment_id")
  customerId      String    @map("customer_id")
  vehicleId       String    @map("vehicle_id")
  enteredAt       DateTime  @map("entered_at")
  status          String    @default("Aguardando diagnostico")

  tenant        Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  appointment   Appointment              @relation(fields: [appointmentId], references: [id], onDelete: Restrict)
  customer      Customer                 @relation(fields: [customerId], references: [id], onDelete: Restrict)
  vehicle       Vehicle                  @relation(fields: [vehicleId], references: [id], onDelete: Restrict)

  @@index([tenantId, enteredAt])
  @@index([tenantId, status, enteredAt])
  @@index([tenantId, customerId, enteredAt])
  @@index([tenantId, vehicleId, enteredAt])
  @@map("reception_check_ins")
}
```

**Money and stock link pattern** (lines 332-410, 502-524):
```prisma
model ServiceCatalogEntry {
  id        String  @id @default(cuid())
  tenantId  String  @map("tenant_id")
  basePrice Decimal @map("base_price") @db.Decimal(12, 2)
  tenant    Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@index([tenantId, deactivatedAt])
  @@map("service_catalog_entries")
}

model StockReservation {
  id              String  @id @default(cuid())
  tenantId        String  @map("tenant_id")
  productId       String  @map("product_id")
  sourceKind      String  @map("source_kind")
  sourceId        String? @map("source_id")
  sourceReference String? @map("source_reference")
  status          String  @default("active")
  @@index([tenantId, sourceKind, sourceId])
  @@map("stock_reservations")
}
```

Apply to quote models by adding tenant-scoped `Quote`, mutable draft items/diagnosis data, immutable `QuoteVersion` and `QuoteVersionItem` snapshot rows, and secure-link token metadata. Published-version rows should store customer-facing snapshots and totals, not only foreign keys to mutable customer/catalog rows.

---

### `apps/api/src/quotes/quoteSchemas.ts` (utility, transform)

**Analog:** `apps/api/src/stock/stockSchemas.ts`

**Imports and reusable validators** (lines 1-28):
```typescript
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const decimalString = z.union([z.string().trim(), z.number().finite()]).transform((value) => {
  const text = typeof value === "number" ? value.toString() : value;

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("Invalid decimal amount.");
  }

  return Number(text).toFixed(2);
});
```

**Array/item validation pattern** (lines 170-180, 205-212):
```typescript
export const createPurchaseSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: positiveIntegerQuantity,
        unitCost: decimalString,
      }),
    )
    .min(1),
});

export const createStockReservationSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: positiveIntegerQuantity,
  sourceId: optionalShortText(120),
  sourceKind,
  sourceLabel: optionalShortText(240),
  sourceReference: optionalShortText(240),
});
```

Apply to quote create/update/publish schemas: validate customerId, vehicleId, optional checkInId, diagnosis fields (`problema`, `causa`, `recomendacao`), item type enum, quantities, money strings, validity date, optional deadline, manual status values, version IDs, and link/PDF route params.

---

### `apps/api/src/quotes/quoteCalculator.ts` (utility, transform)

**Analog:** `apps/api/src/stock/stockSchemas.ts`

**Money normalization source** (lines 20-28):
```typescript
const decimalString = z.union([z.string().trim(), z.number().finite()]).transform((value) => {
  const text = typeof value === "number" ? value.toString() : value;

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("Invalid decimal amount.");
  }

  return Number(text).toFixed(2);
});
```

No exact calculator analog exists. Implement as a pure module with deterministic decimal/integer-cent totals and focused unit tests. Do not rely on frontend calculations for persisted totals.

---

### `apps/api/src/quotes/quoteService.ts` (service, CRUD)

**Analog:** `apps/api/src/reception/checkInService.ts` for check-in/direct entry and `apps/api/src/stock/stockService.ts` for transactions/reservations

**Imports and actor context** (check-in service lines 1-19):
```typescript
import { Prisma } from "@prisma/client";

import { writeAuditLog } from "../audit/auditService.js";
import type { PrismaDatabase } from "../db/prisma.js";
import { badRequest, HttpError } from "../http/errors.js";
import { notFound, requireTenantCustomerVehicleLink } from "../tenancy/tenantScope.js";

type ActorContext = {
  ipAddress?: string | undefined;
  tenantId: string;
  userAgent?: string | undefined;
  userId: string;
};
```

**Tenant-scoped list/get pattern** (check-in service lines 27-64):
```typescript
export async function listCheckIns(
  prisma: PrismaDatabase,
  tenantId: string,
  filters: CheckInListInput,
): Promise<CheckInWithRelations[]> {
  return prisma.receptionCheckIn.findMany({
    include: checkInIncludes,
    orderBy: { enteredAt: "desc" },
    where: {
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      tenantId,
    },
  });
}

export async function getCheckIn(
  prisma: PrismaDatabase,
  tenantId: string,
  checkInId: string,
): Promise<CheckInWithRelations> {
  const checkIn = await prisma.receptionCheckIn.findFirst({
    include: checkInIncludes,
    where: { id: checkInId, tenantId },
  });

  if (!checkIn) {
    throw notFound();
  }

  return checkIn;
}
```

**Direct-or-check-in entry transaction pattern** (check-in service lines 66-115, 250-315):
```typescript
export async function createCheckIn(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateCheckInInput,
): Promise<CheckInWithRelations> {
  await requireTenantCustomerVehicleLink(prisma, actor.tenantId, input);

  return prisma.$transaction(async (tx) => {
    const appointment = input.appointmentId
      ? await convertExistingAppointment(tx as PrismaDatabase, actor, input)
      : await createConvertedTraceAppointment(tx as PrismaDatabase, actor, input);

    const checkIn = await tx.receptionCheckIn.create({
      data: {
        appointmentId: appointment.id,
        createdByUserId: actor.userId,
        customerId: input.customerId,
        tenantId: actor.tenantId,
        vehicleId: input.vehicleId,
      },
      include: checkInIncludes,
    });

    await writeCheckInAudit(tx as PrismaDatabase, actor, checkIn, "reception.checkins.created", [
      "appointmentId",
      "customerId",
      "vehicleId",
    ]);

    return checkIn;
  });
}
```

**Reservation transaction pattern** (stock service lines 147-204):
```typescript
export async function createStockReservation(
  prisma: PrismaDatabase,
  actor: ActorContext,
  input: CreateStockReservationInput,
): Promise<StockReservation> {
  return prisma.$transaction(async (tx) => {
    const stock = await readLockedProductStock(tx, actor.tenantId, input.productId);
    const nextReserved = stock.reservedQuantity + input.quantity;
    const nextAvailable = stock.physicalQuantity - nextReserved;

    if (nextAvailable < 0) {
      throw new HttpError(409, "Insufficient available stock.");
    }

    await tx.productStock.update({
      data: { reservedQuantity: nextReserved },
      where: { id: stock.id },
    });

    const reservation = await tx.stockReservation.create({
      data: {
        createdByUserId: actor.userId,
        productId: input.productId,
        quantity: input.quantity,
        sourceId: input.sourceId,
        sourceKind: input.sourceKind,
        sourceLabel: input.sourceLabel,
        sourceReference: input.sourceReference,
        tenantId: actor.tenantId,
      },
    });

    await writeReservationAudit(tx as PrismaDatabase, actor, reservation, "stock.reservations.created");
    return reservation;
  });
}
```

Use this structure for draft create/update, publish version snapshot, create new version, manual status changes, and optional part reservations with `sourceKind: "quote"`. The publish path must be one transaction: validate tenant links, require diagnosis when quote originates from check-in, calculate totals, insert immutable version/items, update quote status/currentVersionId, create reservation rows if needed, and audit.

---

### `apps/api/src/quotes/quotePdf.ts` (service, streaming)

**Analog:** none in codebase

Use RESEARCH.md Pattern 3 with `pdfkit`. The renderer should accept a published-version DTO only and write customer-facing fields only. It must exclude internal cost, margin, supplier data, internal notes, token hashes, and mutable catalog/customer rows.

Expected route integration:
```typescript
res.type("application/pdf");
res.attachment(`orcamento-${version.publicNumber}.pdf`);
const doc = new PDFDocument({ margin: 36, size: "A4" });
doc.pipe(res);
renderQuotePdf(doc, versionSnapshot);
doc.end();
```

---

### `apps/api/src/http/routes/quotes.ts` (route, request-response + streaming)

**Analog:** `apps/api/src/http/routes/reception.ts` and `apps/api/src/http/routes/stockMovements.ts`

**Imports and route factory** (reception route lines 1-33):
```typescript
import { Router } from "express";

import type { PrismaDatabase } from "../../db/prisma.js";
import { PERMISSIONS } from "../../permissions/permissions.js";
import { asyncHandler, badRequest } from "../errors.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";

export function createReceptionRouter(prisma: PrismaDatabase): Router {
  const router = Router();
```

**Permissioned CRUD route pattern** (reception route lines 133-157):
```typescript
router.post(
  "/reception/check-ins",
  requirePermission(prisma, PERMISSIONS.receptionCheckInsWrite),
  asyncHandler(async (req, res) => {
    const input = parseRequest(createCheckInSchema, req.body, "Invalid check-in data.");
    const checkIn = await createCheckIn(prisma, actorFromRequest(req), input);

    res.status(201).json({
      data: serializeCheckIn(checkIn),
    });
  }),
);
```

**Action route pattern** (stock movements route lines 88-124):
```typescript
router.post(
  "/stock/reservations",
  requirePermission(prisma, PERMISSIONS.stockReservationsCreate),
  asyncHandler(async (req, res) => {
    const input = parseRequest(createStockReservationSchema, req.body, "Invalid stock reservation data.");
    const reservation = await createStockReservation(prisma, actorFromRequest(req), input);

    res.status(201).json({
      data: serializeStockReservation(reservation),
    });
  }),
);
```

**Actor and parse helper** (reception route lines 163-190):
```typescript
function actorFromRequest(req: unknown) {
  const authenticatedReq = req as AuthenticatedRequest;

  return {
    ipAddress: authenticatedReq.ip,
    tenantId: authenticatedReq.auth.tenantId,
    userAgent: authenticatedReq.get("user-agent"),
    userId: authenticatedReq.auth.userId,
  };
}

function parseRequest<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  message: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw badRequest(message);
  }
  return parsed.data;
}
```

Quote routes should include JSON routes for list/get/create/update/publish/new-version/manual-sent/cancel/link and a streaming PDF route. All routes must be behind `requireAuth` via `app.ts` and route-specific `requirePermission`.

---

### `apps/api/src/app.ts` (config, request-response)

**Analog:** `apps/api/src/app.ts`

**Authenticated route mounting** (lines 67-84):
```typescript
app.use(
  requireAuth(prisma, {
    audience: env.jwtAudience,
    issuer: env.jwtIssuer,
    secret: env.jwtAccessSecret,
  }),
);
app.use(createCustomersRouter(prisma));
app.use(createVehiclesRouter(prisma));
app.use(createStockCatalogRouter(prisma));
app.use(createStockMovementsRouter(prisma));
app.use(createReceptionRouter(prisma));
app.use(createReceptionAttachmentsRouter(prisma, env.receptionUploadRoot));
app.use(createTenantSettingsRouter(prisma));
app.use(createUsersRouter(prisma));
app.use(createRolesRouter(prisma));

app.use(createErrorHandler(logger));
```

Add `createQuotesRouter(prisma, env?)` after dependencies it needs are mounted. Keep public approval routes out of this phase.

---

### `apps/api/src/permissions/permissions.ts` and `prisma/seed.ts` (config, request-response/batch)

**Analog:** existing stock/reception permission catalog

**Permission key pattern** (permissions lines 1-37, 57-75):
```typescript
export const PERMISSIONS = {
  receptionCheckInsRead: "reception.checkins.read",
  receptionCheckInsWrite: "reception.checkins.write",
  stockReservationsCancel: "stock.reservations.cancel",
  stockReservationsCreate: "stock.reservations.create",
} as const;

export const ALL_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.stockCatalogRead,
  PERMISSIONS.stockReservationsCreate,
  PERMISSIONS.receptionCheckInsRead,
  PERMISSIONS.receptionCheckInsWrite,
];
```

**Permission details pattern** (permissions lines 177-203):
```typescript
[PERMISSIONS.stockReservationsCreate]: {
  description: "Permite reservar pecas sem alterar o saldo fisico do estoque.",
  name: "Reservar pecas",
},
[PERMISSIONS.receptionCheckInsWrite]: {
  description: "Permite criar e editar check-ins de recepcao com checklist operacional.",
  name: "Gerenciar check-ins de recepcao",
},
```

**Seed pattern** (`prisma/seed.ts` lines 34-40, 77-93):
```typescript
export const IDENTITY_PERMISSION_SEED = [
  ...ALL_PERMISSIONS.map((permissionKey) => ({
    description: PERMISSION_DETAILS[permissionKey].description,
    key: permissionKey,
    name: PERMISSION_DETAILS[permissionKey].name,
  })),
] as const;

export async function seedIdentityPermissions(prisma: FoundationCheckWriter): Promise<void> {
  for (const permission of IDENTITY_PERMISSION_SEED) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: permission,
      update: { name: permission.name, description: permission.description },
    });
  }
}
```

Add quote permissions such as read/write/publish/pdf/link/status. Because seed derives from `ALL_PERMISSIONS`, extending the catalog is sufficient for deterministic permission seeding.

---

### `apps/web/src/api/quotes.ts` (utility, request-response + file-I/O)

**Analog:** `apps/web/src/api/stock.ts` and `apps/web/src/api/reception.ts`

**Typed DTO pattern** (stock API lines 17-26, 107-120):
```typescript
export type ServiceCatalogEntry = {
  basePrice: string;
  createdAt: string;
  deactivatedAt: string | null;
  description: string | null;
  id: string;
  name: string;
  tenantId: string;
};

export type StockReservation = {
  cancelledAt: string | null;
  createdAt: string;
  id: string;
  productId: string;
  quantity: number;
  sourceKind: string;
  status: "active" | "cancelled";
  tenantId: string;
};
```

**Request helper pattern** (stock API lines 296-349):
```typescript
function toQuery(filters: StockFilters): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      query.set(key, value);
    }
  }
  return query.size ? `?${query.toString()}` : "";
}

async function request<T>(
  path: string,
  accessToken: string,
  options: { body?: unknown; method?: string } = {},
): Promise<T> {
  const init: RequestInit = {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${accessToken}`,
    },
    method: options.method ?? "GET",
  };
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = (await readErrorBody(response)) as { error?: { message?: string } } | null;
    throw new ApiError(response.status, toErrorMessage(response.status, body?.error?.message));
  }
  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}
```

For PDF, add a small `fetchQuotePdf`/`openQuotePdf` helper that keeps `Authorization` and reads `Blob` instead of JSON. Keep link copy as a string returned by an authenticated JSON endpoint.

---

### `apps/web/src/App.tsx` (component, event-driven)

**Analog:** existing app shell and operational panels

**Navigation registration pattern** (lines 1379-1402):
```tsx
const operationalItems = useMemo(
  () =>
    [
      {
        icon: faCalendarDays,
        label: "Agenda",
        permission: "reception.appointments.read",
        view: "agenda" as const,
      },
      {
        icon: faBoxesStacked,
        label: "Estoque",
        permission: "stock.catalog.read",
        view: "estoque" as const,
      },
    ].filter((item) => hasPermission(props.session, item.permission)),
  [props.session],
);
```

**Permission-gated panel mount pattern** (lines 1553-1615):
```tsx
{props.activeView === "agenda" ? (
  <AgendaPanel
    blocked={props.blocked.reception}
    canReadCheckIns={hasPermission(props.session, "reception.checkins.read")}
    canWrite={hasPermission(props.session, "reception.appointments.write")}
    canWriteCheckIns={hasPermission(props.session, "reception.checkins.write")}
    checkIns={props.adminData.checkIns}
    customers={props.adminData.customers}
    vehicles={props.adminData.vehicles}
  />
) : null}

{props.activeView === "estoque" ? (
  <StockPanel
    blocked={props.blocked.stock}
    products={props.adminData.products}
    reservations={props.adminData.stockReservations}
    services={props.adminData.services}
  />
) : null}
```

**Compact operational workspace pattern** (lines 3213-3255):
```tsx
<section className="stock-workspace" aria-label="Estoque">
  <div className="panel stock-tabs" role="tablist" aria-label="Areas de estoque">
    {(["servicos", "produtos", "reservas"] as Array<[StockTab, string]>).map(([tab, label]) => (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={activeTab === tab}
        className={activeTab === tab ? "stock-tab stock-tab--active" : "stock-tab"}
        onClick={() => setActiveTab(tab)}
      >
        {label}
      </button>
    ))}
  </div>
  {error ? (
    <p className="callout callout--danger" role="status">
      {error}
    </p>
  ) : null}
</section>
```

Add `orcamentos` to `View`, data state, blocked state, loaders, navigation, and a compact `QuotesPanel` with tabs/filters/table/detail. Actions should be `Publicar versao`, `Criar nova versao`, `Copiar link`, `Imprimir/Gerar PDF`, and manual `Marcar como enviado`; no automatic WhatsApp/email behavior.

---

### API tests (test, request-response/CRUD/streaming)

**Analogs:** `apps/api/src/test/reception-contract.test.ts`, `apps/api/src/test/stock-contract.test.ts`, `apps/api/src/test/reception-audit.test.ts`

**Integration test harness** (reception contract lines 1-31, 91-95):
```typescript
import { createServer, type Server } from "node:http";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { DestinationStream } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createCustomerFixture, createTenantWithAdmin, createVehicleFixture, loginAs } from "./testData.js";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
let server: Server;
let baseUrl: string;

const logStream: DestinationStream = {
  write() {
    // keep reception contract tests quiet while exercising the logger seam
  },
};
```

**Entry-point and validation assertions** (reception contract lines 406-475, 528-570):
```typescript
const appointment = await createAppointment(headers, {
  customerId: customer.customerId,
  expectedService: "Recepcao para diagnostico",
  origin: "counter",
  startsAt: "2026-07-24T12:00:00.000Z",
  vehicleId: vehicle.vehicleId,
});

const response = await createCheckIn(headers, {
  appointmentId: appointment.id,
  customerId: customer.customerId,
  damageNotes: "Risco visivel no parachoque traseiro",
  enteredAt: "2026-07-24T12:10:00.000Z",
  fuelLevel: "1/2",
  vehicleId: vehicle.vehicleId,
});

expect(response.status).toBe(201);
expect(body.data).toMatchObject({
  customerId: customer.customerId,
  tenantId: fixture.tenantId,
  vehicleId: vehicle.vehicleId,
});

expect(missingFuel.status).toBe(400);
expect(foreignCustomerVehicle.status).toBe(400);
```

**Reservation/version source assertions** (stock contract lines 654-721, 795-835):
```typescript
const reservationResponse = await fetch(`${baseUrl}/stock/reservations`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    productId: product.id,
    quantity: 4,
    sourceKind: "quote",
    sourceLabel: "Orcamento manual",
    sourceReference: "ORC-2026-001",
  }),
});

expect(reservationResponse.status).toBe(201);
expect(reservation.data).toMatchObject({
  sourceKind: "quote",
  status: "active",
  tenantId: fixture.tenantId,
});
expect(foreignProductReservation.status).toBe(404);
expect(foreignCancel.status).toBe(404);
```

**Audit assertions** (reception audit lines 127-147):
```typescript
const auditRows = await getAuditRows(prisma);

expect(auditRows.map((row) => row.action)).toEqual(
  expect.arrayContaining(["reception.appointments.converted", "reception.checkins.created"]),
);
expect(auditRows).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      entity: "reception_check_in",
      recordId: checkIn.id,
      tenantId: fixture.tenantId,
      userId: fixture.adminId,
    }),
  ]),
);
```

Quote tests should cover QTE-01 through QTE-11, especially: diagnosis required only for check-in-origin publish, discount above limit warning-only, immutable published versions after draft/catalog edits, new-version copy, PDF from snapshot, link/PDF blocked before publish, no internal fields in PDF/link DTO, and no communication side effects.

---

### `apps/web/src/test/quote-ui.test.tsx` (test, event-driven)

**Analog:** `apps/web/src/test/reception-ui.test.tsx`

**UI test harness** (lines 1-25):
```typescript
// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../App.js";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
```

**Operational interaction and no-communication assertion pattern** (lines 250-275, 291-311):
```typescript
const checkInsTable = await screen.findByRole("table", { name: "Check-ins recebidos" });
expect(checkInsTable).toHaveTextContent("Aguardando diagnostico");
fireEvent.click(within(checkInsTable).getByRole("button", { name: "Consultar check-in" }));

const detail = await screen.findByRole("region", { name: "Detalhe do check-in" });
fireEvent.change(within(detail).getByLabelText(/Quilometragem/), {
  target: { value: "45200" },
});
fireEvent.click(within(detail).getByRole("button", { name: "Salvar checklist" }));

expect(await screen.findByText("Checklist atualizado com auditoria do backend.")).toBeInTheDocument();
assertNoCommunicationLanguage();
```

Quote UI tests should mock login/admin data plus quote routes, exercise tab/filter/detail editing, publish/link/PDF gating, warning-only discount behavior, and assert no automatic communication language or WhatsApp/email URL side effects.

## Shared Patterns

### Backend Authorization
**Source:** `apps/api/src/http/middleware/requirePermission.ts`
**Apply to:** all quote JSON and PDF routes
```typescript
export function requirePermission(prisma: PrismaDatabase, permission: PermissionKey) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as Partial<AuthenticatedRequest>).auth;

    if (!auth) {
      throw unauthorized();
    }

    if (!(await hasPermission(prisma, auth.userId, permission))) {
      throw forbidden();
    }

    next();
  });
}
```

### Tenant Validation
**Source:** `apps/api/src/tenancy/tenantScope.ts`
**Apply to:** quote customer, vehicle, check-in, product, service, version and token lookups
```typescript
export async function requireTenantCustomerVehicleLink(
  prisma: PrismaDatabase,
  tenantId: string,
  input: { customerId: string; vehicleId: string },
): Promise<void> {
  const [customer, vehicle] = await Promise.all([
    prisma.customer.findFirst({ select: { id: true }, where: { deletedAt: null, id: input.customerId, tenantId } }),
    prisma.vehicle.findFirst({ select: { customerId: true, id: true }, where: { deletedAt: null, id: input.vehicleId, tenantId } }),
  ]);

  if (!customer || !vehicle) {
    throw badRequest("Customer and vehicle IDs must belong to the authenticated tenant.");
  }

  if (vehicle.customerId !== customer.id) {
    throw badRequest("Vehicle must belong to the informed customer.");
  }
}
```

### Audit Sanitization
**Source:** `apps/api/src/audit/auditService.ts`
**Apply to:** diagnosis edits, draft item edits, publish, new version, manual status, PDF/link actions
```typescript
const SENSITIVE_KEY_PATTERN = /password|token|code|hash|secret/i;

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

### Route Error Handling
**Source:** `apps/api/src/http/routes/reception.ts`
**Apply to:** all quote route request parsing
```typescript
function parseRequest<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  message: string,
): T {
  try {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      throw badRequest(message);
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === "HttpError") {
      throw error;
    }
    throw badRequest(message);
  }
}
```

### App Shell
**Source:** `apps/web/src/App.tsx`
**Apply to:** Orçamentos menu item, permissions, data loaders and panel mount
```tsx
{
  icon: faBoxesStacked,
  label: "Estoque",
  permission: "stock.catalog.read",
  view: "estoque" as const,
}
```

Copy the same `hasPermission` filtering and blocked-state behavior; frontend controls are usability only.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/api/src/quotes/quotePdf.ts` | service | streaming | No PDF or binary streaming route exists yet. Use `pdfkit` from RESEARCH.md and Express response streaming. |
| `apps/api/src/quotes/quoteCalculator.ts` | utility | transform | No dedicated money calculator exists. Use existing decimal input conventions, but implement pure deterministic total functions with tests. |

## Metadata

**Analog search scope:** `apps/api/src`, `apps/web/src`, `prisma`, `prisma/migrations`, `package.json`
**Files scanned:** 35+ targeted files via `rg --files` and pattern grep
**Pattern extraction date:** 2026-07-28
