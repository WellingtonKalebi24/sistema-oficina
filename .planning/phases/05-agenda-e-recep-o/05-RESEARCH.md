# Phase 05: Agenda e Recepcao - Research

**Researched:** 2026-07-24
**Domain:** Agenda, recepcao, anexos tenant-scoped, Express/Prisma/React
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Fluxo de entrada
- **D-01:** Check-in can start from an existing appointment or directly from tenant-scoped customer/vehicle data.
- **D-02:** Every completed check-in sets the operational status to `Aguardando diagnostico`.
- **D-03:** When a check-in starts from an appointment, the appointment status becomes `Convertido`.
- **D-04:** When a customer arrives without an appointment, direct check-in creates an automatically converted appointment for traceability.
- **D-05:** Check-in must always be linked to tenant-scoped customer and vehicle records. Backend validation remains authoritative.

### Checklist e anexos
- **D-06:** The check-in form should collect a complete reception checklist, but mileage and items left in the vehicle are optional.
- **D-07:** Required reception data should include customer, vehicle, entry date/time, fuel level and damage/checklist inspection data.
- **D-08:** Photos, documents and other files are always optional; missing attachments must not block check-in completion.
- **D-09:** Attachments use detailed categories: `Avaria`, `Documento`, `Painel`, `Motor`, `Interior`, `Outro`.
- **D-10:** After check-in completion, all check-in data may be edited when permitted, but every edit must be audited.
- **D-11:** Attachment access, mutation and deletion must respect tenant isolation and backend permission checks.

### Agenda visual
- **D-12:** The default agenda visualization is a list/table ordered by time.
- **D-13:** Tenant settings should allow the office to choose the agenda visualization model: time table, visual calendar or status kanban.
- **D-14:** The agenda visualization setting applies per office/tenant, not per user.
- **D-15:** In the table view, row actions should be limited to the main actions: `Fazer check-in`, `Editar`, `Cancelar`.
- **D-16:** On mobile, agenda rows show a compact summary and open details/actions in a separate screen or modal.
- **D-17:** The first agenda screen should treat the agenda timeline/table as the primary visual anchor; filters and check-in actions are secondary controls.

### the agent's Discretion
- The planner may choose the exact data model, endpoint names, permission key names, upload storage strategy and UI component decomposition if the choices respect the locked decisions above, the approved UI-SPEC and the project constraints.
- The planner may implement the tenant-level visualization setting as a select/segmented option even if the user described it as checkbox, because only one visualization can be active at a time.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

None - discussion stayed within Phase 5 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-01 | User can create, edit and view appointments in daily and weekly agenda views. | Appointment model, `/reception/appointments` routes, day/week filters and table-first UI. [VERIFIED: codebase grep] |
| REC-02 | User can associate appointment with customer and vehicle. | Use existing tenant-scoped `Customer` and `Vehicle` foreign keys and `requireTenantCustomerVehicleLink`. [VERIFIED: codebase grep] |
| REC-03 | User can perform vehicle check-in from an appointment or directly from customer/vehicle data. | Transactional service converts existing appointments or creates a converted trace appointment. [VERIFIED: codebase grep] |
| REC-04 | User can record checklist items, mileage, fuel level, damage notes and items left in the vehicle. | `ReceptionCheckIn` plus `ReceptionChecklistItem` stores required fuel/checklist data and optional mileage/items. [ASSUMED] |
| REC-05 | User can attach photos and files to the check-in record. | Route-scoped `multer` upload plus `CheckInAttachment` metadata and tenant-protected download routes. [CITED: https://github.com/expressjs/multer] |
| REC-06 | User can consult check-in records after reception. | `/reception/check-ins` list/detail endpoints with customer/vehicle include and attachment counts. [VERIFIED: codebase grep] |
| REC-07 | Reception data and attachments cannot cross tenant boundaries. | All reception tables carry `tenantId`; reads/mutations filter by authenticated tenant and stream files only after DB ownership check. [VERIFIED: codebase grep] |
| REC-08 | Relevant reception changes are audited. | Existing `writeAuditLog` supports tenant/user/action/entity/record metadata and sanitizes sensitive keys. [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 5 should extend the existing vertical MVP pattern: Prisma migration first, RED API contracts, protected Express routers after `requireAuth`, tenant-scoped services, then authenticated React UI inside the current admin shell. [VERIFIED: codebase grep] The core implementation should not add diagnosis, quotes, OS, finance, reminders, WhatsApp, email, SMS, notification center, delivery/read tracking or customer communication controls. [VERIFIED: AGENTS.md]

The recommended backend shape is four tenant-scoped operational tables: `Appointment`, `ReceptionCheckIn`, `ReceptionChecklistItem` and `CheckInAttachment`, plus one `CompanySetting.agendaViewMode` column for the tenant-level agenda preference. [ASSUMED] File bytes should be stored on local disk for Docker development under a configured upload root, while DB rows store tenant/check-in ownership and relative paths; downloads and deletes must go through authenticated API routes rather than public static exposure. [CITED: https://expressjs.com/en/5x/starter/static-files/]

**Primary recommendation:** Implement a `reception` module using Prisma transactions for appointment conversion/direct check-in, `multer` for route-scoped multipart upload, backend permissions for every action, and compact table-first UI matching `05-UI-SPEC.md`. [VERIFIED: npm registry]

## Project Constraints (from AGENTS.md)

- Keep the stack React, Vite, TypeScript, Node.js, Express, PostgreSQL, Prisma and Docker Compose unless a technical decision records the change. [VERIFIED: AGENTS.md]
- Enforce authorization in the backend; hiding frontend buttons is only usability. [VERIFIED: AGENTS.md]
- Filter and validate all operational records by authenticated tenant. [VERIFIED: AGENTS.md]
- Do not send messages, open WhatsApp automatically, or record communication delivery/read state. [VERIFIED: AGENTS.md]
- Use transactions where partial operational state would be harmful. [VERIFIED: AGENTS.md]
- Audit critical actions with tenant, user, action, entity, record, timestamp and relevant non-secret values. [VERIFIED: AGENTS.md]
- Do not complete a phase with failing lint, typecheck, tests, migrations or critical validations. [VERIFIED: AGENTS.md]
- Completion needs executable verification, not just created files/screens/endpoints. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Appointment CRUD and day/week filters | API / Backend | Database / Storage | Backend owns permission, tenant filters and persisted ordering. [VERIFIED: codebase grep] |
| Check-in conversion/direct check-in | API / Backend | Database / Storage | Status changes and trace appointment creation must be atomic. [VERIFIED: codebase grep] |
| Checklist persistence | API / Backend | Database / Storage | Server validation decides required fuel/checklist and optional mileage/items. [VERIFIED: codebase grep] |
| Attachment upload/download/delete | API / Backend | Database / Storage | File access requires backend tenant and permission checks before streaming bytes. [CITED: https://github.com/expressjs/multer] |
| Agenda/check-in UI | Browser / Client | API / Backend | React renders table/week/check-in forms, but API remains authoritative. [VERIFIED: codebase grep] |
| Agenda visualization preference | API / Backend | Database / Storage | Preference is tenant-level office configuration in `CompanySetting`. [VERIFIED: codebase grep] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express | 5.2.1 current on npm, repo uses 5.2.1 | Protected reception routers and file streaming endpoints | Existing API framework and official static/middleware docs cover route mounting. [VERIFIED: npm registry] |
| Prisma Client | npm latest 7.9.0, repo pinned 7.8.0 | Tenant-scoped models, relations and transactions | Existing schema/migrations use Prisma and PostgreSQL. [VERIFIED: npm registry] |
| Zod | 4.4.3 | Request validation for agenda/check-in payloads | Existing API schemas use Zod safeParse and transforms. [VERIFIED: npm registry] |
| Multer | 2.2.0 | Route-scoped multipart parser for check-in attachments | Official expressjs/multer docs describe multipart handling, disk storage, limits and fileFilter. [VERIFIED: npm registry] |
| React | npm latest 19.2.8, repo uses 19.2.7 | Authenticated agenda and reception UI | Existing web app is React/Vite with jsdom tests. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.10 | API integration and web behavior tests | Existing workspaces use `vitest run`; API config disables file parallelism. [VERIFIED: npm registry] |
| Testing Library React | 16.3.2 | Web tests for agenda nav, forms, blocked states and uploads | Existing web tests use it with jsdom. [VERIFIED: codebase grep] |
| Node `fs`, `path`, `crypto` | Node 22.14.0 available | Directory creation, path normalization and optional checksum | Use built-ins instead of adding storage/checksum packages. [VERIFIED: environment probe] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `multer` | Hand-parse multipart streams | Hand parsing misses limits, field/file semantics and error paths; avoid. [CITED: https://github.com/expressjs/multer] |
| Local disk upload root | S3-compatible object storage | Production-ready later, but Phase 5 is local Docker MVP and production provider is still undecided. [VERIFIED: AGENTS.md] |
| Dedicated checklist table | JSON-only checklist field | JSON is faster to add but weaker for item-level updates/history; table is clearer for auditable checklist facts. [ASSUMED] |

**Installation:**
```bash
npm install multer -w apps/api
```

Avoid installing `@types/multer` unless a human approves the SUS package checkpoint; prefer a narrow local declaration if TypeScript requires it. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| multer | npm | created 2014-02-01; modified 2026-06-15 | 19,500,700/week from legitimacy seam | github.com/expressjs/multer | OK | Approved |
| @types/multer | npm | created 2016-05-17; modified 2026-07-01 | 9,105,115/week from legitimacy seam | github.com/DefinitelyTyped/DefinitelyTyped | SUS | Do not install by default; checkpoint required |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@types/multer` - planner must add `checkpoint:human-verify` before installing it.

## Architecture Patterns

### System Architecture Diagram

```text
Authenticated operator
  -> React admin shell: Agenda tab/table/check-in panel
  -> API /reception routes after requireAuth
  -> requirePermission + Zod validation
  -> tenant scope validation for customer + vehicle
  -> Prisma transaction
       -> appointment create/update/cancel OR appointment converted
       -> check-in create/update with status Aguardando diagnostico
       -> checklist item rows
       -> audit rows
  -> optional attachment route with route-scoped multer
       -> validate check-in tenant ownership
       -> write local file under upload root
       -> CheckInAttachment metadata row
       -> audit row
  -> React refreshes agenda/check-in lists from persisted API data
```

### Recommended Project Structure

```text
apps/api/src/reception/
  receptionSchemas.ts      # Zod schemas, enum-like constants, serializers
  appointmentService.ts    # appointment CRUD/cancel/list/day/week
  checkInService.ts        # check-in conversion, direct check-in, edit, read/list
  attachmentService.ts     # upload metadata, storage path, download/delete authorization
apps/api/src/http/routes/
  reception.ts             # protected JSON routes
  receptionAttachments.ts  # protected multipart/download routes
apps/web/src/api/
  reception.ts             # JSON + FormData client
apps/web/src/
  App.tsx                  # add Agenda view, state and handlers following current shell
```

### Pattern 1: Tenant-Scoped Reception Relations

**What:** Add `tenantId` to every reception table and use foreign keys to tenant-scoped customer/vehicle/check-in rows. [VERIFIED: codebase grep]
**When to use:** Every query and mutation in Phase 5. [VERIFIED: AGENTS.md]
**Example:**
```prisma
model Appointment {
  id         String   @id @default(cuid())
  tenantId   String   @map("tenant_id")
  customerId String   @map("customer_id")
  vehicleId  String   @map("vehicle_id")
  startsAt   DateTime @map("starts_at")
  status     String   @default("Agendado")

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)
  vehicle  Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Restrict)

  @@index([tenantId, startsAt])
  @@index([tenantId, status, startsAt])
  @@map("appointments")
}
```

### Pattern 2: Atomic Check-In Conversion

**What:** In one Prisma `$transaction`, validate tenant ownership, create/update appointment, create check-in, create checklist item rows, and write audit rows. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
**When to use:** Check-in from appointment, direct check-in, and audit-relevant check-in edits. [VERIFIED: codebase grep]
**Example:**
```typescript
return prisma.$transaction(async (tx) => {
  await requireTenantCustomerVehicleLink(tx as PrismaDatabase, actor.tenantId, input);
  const appointment = input.appointmentId
    ? await convertAppointment(tx, actor, input.appointmentId)
    : await createConvertedTraceAppointment(tx, actor, input);
  const checkIn = await tx.receptionCheckIn.create({ data: { ...data, appointmentId: appointment.id } });
  await writeAuditLog(tx as PrismaDatabase, { action: "reception.checkins.created", entity: "reception_check_in", recordId: checkIn.id, tenantId: actor.tenantId, userId: actor.userId });
  return checkIn;
});
```

### Pattern 3: Protected Attachment Streaming

**What:** Store file metadata in DB and serve bytes only after DB lookup by `tenantId`, `checkInId` and permission. [CITED: https://expressjs.com/en/5x/starter/static-files/]
**When to use:** Upload, download and delete attachments. [VERIFIED: AGENTS.md]
**Example:**
```typescript
router.post(
  "/reception/check-ins/:checkInId/attachments",
  requirePermission(prisma, PERMISSIONS.receptionAttachmentsWrite),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const attachment = await createCheckInAttachment(prisma, actorFromRequest(req), req.params.checkInId, req.file, req.body);
    res.status(201).json({ data: serializeAttachment(attachment) });
  }),
);
```

### Anti-Patterns to Avoid

- **Public `/uploads` static mount for reception files:** Express can serve static directories, but Phase 5 attachments need tenant authorization first. [CITED: https://expressjs.com/en/5x/starter/static-files/]
- **Global multer middleware:** Multer warns against global middleware because unwanted routes could receive uploads. [CITED: https://github.com/expressjs/multer]
- **MemoryStorage for arbitrary files:** Multer warns memory storage can exhaust memory under large/rapid uploads. [CITED: https://github.com/expressjs/multer]
- **Frontend-only tenant/customer/vehicle validation:** Backend tenant validation is mandatory. [VERIFIED: AGENTS.md]
- **Communication wording or controls:** UI must not imply reminders, messages, send actions, delivery or read state. [VERIFIED: 05-UI-SPEC.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart parsing | Custom boundary parser | `multer` route middleware | Handles file/text fields, disk storage, limits and filters. [CITED: https://github.com/expressjs/multer] |
| Tenant ownership checks | Client-side checks only | `tenantId` filters plus `requireTenantCustomerVehicleLink` style helpers | Existing service pattern prevents cross-tenant reads/mutations. [VERIFIED: codebase grep] |
| Audit redaction | Ad hoc per-route redaction | Existing `writeAuditLog` / `sanitizeAuditMetadata` | Central pattern removes secret-shaped metadata keys. [VERIFIED: codebase grep] |
| Attachment authorization | Guess tenant from path | DB lookup before stream/delete | Paths are not authority; DB row owns tenant/check-in relation. [ASSUMED] |

**Key insight:** The hard part is not rendering an agenda; it is keeping appointment conversion, check-in facts, file metadata and audit rows consistent under tenant boundaries. [VERIFIED: AGENTS.md]

## Common Pitfalls

### Pitfall 1: Attachment Path Becomes Authorization
**What goes wrong:** A user can infer or request another tenant file path. [ASSUMED]
**Why it happens:** Files are exposed through static middleware or predictable paths. [CITED: https://expressjs.com/en/5x/starter/static-files/]
**How to avoid:** Store relative paths, normalize paths under an upload root, and stream only after `CheckInAttachment` lookup by authenticated `tenantId`. [ASSUMED]
**Warning signs:** `app.use("/uploads", express.static(...))` appears without auth middleware. [CITED: https://expressjs.com/en/5x/starter/static-files/]

### Pitfall 2: Direct Check-In Skips Appointment Traceability
**What goes wrong:** Walk-in vehicles have check-ins but no agenda trace row. [VERIFIED: 05-CONTEXT.md]
**Why it happens:** Direct path is implemented as a separate shortcut. [ASSUMED]
**How to avoid:** Direct check-in service creates an appointment already marked `Convertido` in the same transaction. [VERIFIED: 05-CONTEXT.md]
**Warning signs:** `ReceptionCheckIn.appointmentId` is nullable for direct check-ins without a generated trace record. [ASSUMED]

### Pitfall 3: Checklist Edit Overwrites Without Audit
**What goes wrong:** Mileage, fuel, damage notes or items left are changed after reception without trace. [VERIFIED: 05-CONTEXT.md]
**Why it happens:** Update route treats check-in as ordinary mutable form data. [ASSUMED]
**How to avoid:** Audit changed field names and relevant old/new status references; avoid storing full large notes or file bytes in audit payload. [VERIFIED: codebase grep]
**Warning signs:** `updateMany` on checklist items with no `writeAuditLog`. [VERIFIED: codebase grep]

### Pitfall 4: UI Required Fields Drift From Backend
**What goes wrong:** UI blocks optional mileage/items or allows missing fuel/checklist. [VERIFIED: 05-CONTEXT.md]
**Why it happens:** UI-SPEC says required mileage in one place while CONTEXT decisions say mileage optional and fuel/checklist required. [VERIFIED: 05-UI-SPEC.md]
**How to avoid:** Planner should treat CONTEXT locked decisions as higher priority: customer, vehicle, entry date/time, fuel level and damage/checklist inspection are required; mileage/items/attachments optional. [VERIFIED: 05-CONTEXT.md]
**Warning signs:** HTML `required` on mileage or attachment file input. [VERIFIED: 05-CONTEXT.md]

## Code Examples

### FormData Upload Client
```typescript
// Source: MDN FormData docs
const data = new FormData();
data.append("category", "Avaria");
data.append("file", selectedFile, selectedFile.name);
await fetch(`${API_BASE_URL}/reception/check-ins/${checkInId}/attachments`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: data,
});
```
[CITED: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects]

### Permission Keys
```typescript
receptionAppointmentsRead: "reception.appointments.read",
receptionAppointmentsWrite: "reception.appointments.write",
receptionAppointmentsCancel: "reception.appointments.cancel",
receptionCheckInsRead: "reception.checkins.read",
receptionCheckInsWrite: "reception.checkins.write",
receptionAttachmentsRead: "reception.attachments.read",
receptionAttachmentsWrite: "reception.attachments.write",
receptionAttachmentsDelete: "reception.attachments.delete",
```
[ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public static upload directory for operational files | Authenticated route streams file after DB tenant check | Current recommendation | Prevents URL/path access from bypassing backend authorization. [ASSUMED] |
| Free-form calendar UI first | Dense table/list default with day/week filters | Locked Phase 5 decision | Fits workshop scanning and mobile modal/detail behavior. [VERIFIED: 05-CONTEXT.md] |
| Multipart parser as global middleware | Route-scoped upload middleware with limits | Multer official guidance | Reduces unexpected upload surface and DoS risk. [CITED: https://github.com/expressjs/multer] |

**Deprecated/outdated:**
- Global upload middleware: unsafe for this phase because upload routes must be explicit and protected. [CITED: https://github.com/expressjs/multer]
- Browser-only permission checks: contradicts project security constraints. [VERIFIED: AGENTS.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Use dedicated `ReceptionChecklistItem` rows instead of JSON-only checklist storage. | Summary, Standard Stack, Patterns | Planner may choose JSON and lose item-level query/update clarity. |
| A2 | Store local attachment bytes under a configured upload root and stream via API. | Summary, Patterns, Pitfalls | Future production storage may require migration/adaptation. |
| A3 | Suggested permission key names are final. | Code Examples | Permission naming may be adjusted by planner to match product language. |
| A4 | Attachment path authorization risk is mitigated by DB lookup before streaming. | Don't Hand-Roll, Pitfalls | Implementation must still normalize paths and test traversal cases. |

## Open Questions (RESOLVED)

1. **Should `agendaViewMode` live directly on `CompanySetting`?**
   - What we know: Phase 5 requires a tenant-level visualization setting, and `CompanySetting` already stores tenant settings. [VERIFIED: codebase grep]
   - Resolution: Store `agendaViewMode` directly on `CompanySetting` because D-13 and D-14 make the visualization mode a tenant-level office configuration, not a user preference. Add `agendaViewMode String @default("table")` with accepted values `table`, `calendar`, `kanban`. [RESOLVED: user revision instruction]

2. **Should attachment deletes remove bytes immediately or mark rows deleted?**
   - What we know: UI requires destructive confirmation and backend permission checks. [VERIFIED: 05-UI-SPEC.md]
   - Resolution: Attachment deletion soft-deletes metadata with audit while removing physical bytes when feasible. Metadata remains tenant-scoped and non-downloadable after deletion so history is audit-safe without exposing files. [RESOLVED: user revision instruction]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | API/web build and tests | yes | v22.14.0 | none |
| npm | workspace scripts/package install | yes | 10.9.2 | none |
| Docker | local db/api/web verification | yes | 29.6.1 | run local services manually |
| Docker Compose | local stack | yes | v5.3.0 | `npm run db:migrate` against local PostgreSQL |
| PostgreSQL CLI (`psql`, `pg_isready`) | optional local probing | no | unavailable in PATH | Docker healthcheck already uses container `pg_isready` |
| Local upload directory | attachment storage | no | `uploads/` absent | planner must create directory and Docker volume/bind mount |

**Missing dependencies with no fallback:**
- Local upload directory/volume is absent; plan must create/configure it before attachment tests. [VERIFIED: environment probe]

**Missing dependencies with fallback:**
- Host PostgreSQL CLI is absent; Docker service healthcheck remains the local verification path. [VERIFIED: environment probe]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 for API and web. [VERIFIED: npm registry] |
| Config file | `apps/api/vitest.config.ts` with `fileParallelism: false`; web uses package script defaults. [VERIFIED: codebase grep] |
| Quick run command | `npm run test -w apps/api -- reception-contract && npm run test -w apps/web -- reception-ui` |
| Full suite command | `npm run verify` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REC-01 | Appointment create/edit/day/week list | API + UI | `npm run test -w apps/api -- reception-contract` | No - Wave 0 |
| REC-02 | Appointment customer/vehicle association | API | `npm run test -w apps/api -- reception-contract` | No - Wave 0 |
| REC-03 | Check-in from appointment and direct check-in trace appointment | API | `npm run test -w apps/api -- reception-contract` | No - Wave 0 |
| REC-04 | Checklist, mileage, fuel, damage and items-left persistence | API + UI | `npm run test -w apps/api -- reception-contract` | No - Wave 0 |
| REC-05 | Multipart attachment upload/list/delete/download metadata | API + UI | `npm run test -w apps/api -- reception-attachments` | No - Wave 0 |
| REC-06 | Check-in consultation after reception | API + UI | `npm run test -w apps/web -- reception-ui` | No - Wave 0 |
| REC-07 | Cross-tenant reception and attachment blocking | API | `npm run test -w apps/api -- reception-isolation` | No - Wave 0 |
| REC-08 | Audit rows for conversion/check-in/edit/attachment mutation | API | `npm run test -w apps/api -- reception-audit` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** targeted API or web command above. [VERIFIED: codebase grep]
- **Per wave merge:** `npm run verify`. [VERIFIED: package.json]
- **Phase gate:** clean `npm run db:migrate`, targeted tests, `npm run verify`, and Docker smoke if attachment volume/config changes. [VERIFIED: package.json]

### Wave 0 Gaps
- [ ] `apps/api/src/test/reception-contract.test.ts` - REC-01..REC-04, REC-06.
- [ ] `apps/api/src/test/reception-attachments.test.ts` - REC-05 and tenant-protected file access.
- [ ] `apps/api/src/test/reception-isolation.test.ts` - REC-07 cross-tenant appointment/check-in/attachment blocking.
- [ ] `apps/web/src/test/reception-ui.test.tsx` - agenda nav, table/week/check-in/attachments, 403 blocked state, no communication language.
- [ ] Test fixture cleanup must add reception tables before customer/vehicle deletes. [VERIFIED: codebase grep]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Existing `requireAuth` before protected routers. [VERIFIED: codebase grep] |
| V3 Session Management | yes | Existing bearer access token/refresh flow; no new browser secret storage for reception. [VERIFIED: codebase grep] |
| V4 Access Control | yes | `requirePermission` plus tenant-filtered DB lookups. [VERIFIED: codebase grep] |
| V5 Input Validation | yes | Zod schemas, enum-like status/category/fuel validation, multer limits/fileFilter. [CITED: https://github.com/expressjs/multer] |
| V6 Cryptography | yes | Use Node `crypto.randomUUID`/hash if checksums are added; do not invent crypto. [ASSUMED] |
| V12 File and Resources | yes | Route-scoped upload parser, file size/count limits, path normalization, protected streaming. [CITED: https://github.com/expressjs/multer] |

### Known Threat Patterns for Express/Prisma Attachments

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant file read by guessed URL/path | Information Disclosure | Do DB lookup by `tenantId` and attachment id before streaming. [ASSUMED] |
| Path traversal in stored filename | Tampering | Ignore original name for storage path; generate server filename and keep originalName as metadata. [ASSUMED] |
| Oversized upload DoS | Denial of Service | Multer `limits.fileSize`, `limits.files`, `limits.fields`, `fileFilter`. [CITED: https://github.com/expressjs/multer] |
| Unauthorized conversion/edit | Elevation of Privilege | Separate appointment/check-in/attachment permission keys enforced server-side. [VERIFIED: codebase grep] |
| Audit leaks notes or file names containing secrets | Information Disclosure | Keep audit metadata concise; existing sanitizer removes secret-shaped keys. [VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)
- `AGENTS.md` - stack, tenant, security, audit, communication and quality constraints. [VERIFIED: codebase grep]
- `05-CONTEXT.md` - locked Phase 5 flow, checklist, attachment and agenda decisions. [VERIFIED: codebase grep]
- `05-UI-SPEC.md` and `docs/VISUAL_CONTRACT.md` - approved UI structure, copy and visual constraints. [VERIFIED: codebase grep]
- Existing code: `app.ts`, `requirePermission.ts`, `tenantScope.ts`, `auditService.ts`, `permissions.ts`, customer/vehicle/stock services/routes/tests. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)
- https://github.com/expressjs/multer - multipart middleware, disk storage, limits, fileFilter and warnings. [CITED: https://github.com/expressjs/multer]
- https://expressjs.com/en/5x/starter/static-files/ - static file serving and absolute path guidance. [CITED: https://expressjs.com/en/5x/starter/static-files/]
- https://www.prisma.io/docs/orm/prisma-client/queries/transactions - transaction guidance. [CITED: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects - FormData/fetch file upload behavior. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects]
- npm registry checks for Express, Prisma, Zod, React, Vite, Vitest, Multer. [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- Assumed checklist table and attachment retention details listed in Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - current versions and package legitimacy verified; `@types/multer` remains SUS and should not be installed without checkpoint.
- Architecture: HIGH - grounded in existing codebase patterns and locked phase decisions.
- Pitfalls: MEDIUM - file upload risks are sourced from official docs plus project constraints, but retention/storage production policy is still undecided.

**Research date:** 2026-07-24
**Valid until:** 2026-08-23 for codebase patterns; package versions should be rechecked before installation.
