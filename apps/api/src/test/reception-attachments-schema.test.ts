import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ALL_PERMISSIONS, PERMISSION_DETAILS, PERMISSIONS } from "../permissions/permissions.js";

const schemaPath = fileURLToPath(new URL("../../../../prisma/schema.prisma", import.meta.url));
const migrationPath = fileURLToPath(
  new URL(
    "../../../../prisma/migrations/20260724110000_add_checkin_attachments/migration.sql",
    import.meta.url,
  ),
);

describe("reception attachment schema contract", () => {
  it("defines tenant-scoped check-in attachment metadata and audit deletion fields", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toMatch(/model\s+CheckInAttachment\b/);
    expect(schema).toMatch(/tenantId\s+String\s+@map\("tenant_id"\)/);
    expect(schema).toMatch(/checkInId\s+String\s+@map\("check_in_id"\)/);
    expect(schema).toMatch(/category\s+String/);
    expect(schema).toMatch(/originalName\s+String\s+@map\("original_name"\)/);
    expect(schema).toMatch(/storedName\s+String\s+@map\("stored_name"\)/);
    expect(schema).toMatch(/relativePath\s+String\s+@map\("relative_path"\)/);
    expect(schema).toMatch(/mimeType\s+String\s+@map\("mime_type"\)/);
    expect(schema).toMatch(/sizeBytes\s+Int\s+@map\("size_bytes"\)/);
    expect(schema).toMatch(/uploadedByUserId\s+String\?\s+@map\("uploaded_by_user_id"\)/);
    expect(schema).toMatch(/deletedAt\s+DateTime\?\s+@map\("deleted_at"\)/);
    expect(schema).toMatch(/deletedByUserId\s+String\?\s+@map\("deleted_by_user_id"\)/);
    expect(schema).toMatch(/@@index\(\[tenantId, checkInId, deletedAt\]\)/);
    expect(schema).toMatch(/@@index\(\[tenantId, category\]\)/);
    expect(schema).toMatch(/@@map\("check_in_attachments"\)/);
  });

  it("locks the canonical D-09 attachment categories in the migration", async () => {
    const migration = await readFile(migrationPath, "utf8");

    for (const category of ["Avaria", "Documento", "Painel", "Motor", "Interior", "Outro"]) {
      expect(migration).toContain(`'${category}'`);
    }

    expect(migration).toMatch(/check_in_attachments_category_check/);
  });

  it("adds read, write and delete permissions for reception attachments", () => {
    const requiredPermissions = [
      "reception.attachments.read",
      "reception.attachments.write",
      "reception.attachments.delete",
    ];

    expect(PERMISSIONS.receptionAttachmentsRead).toBe(requiredPermissions[0]);
    expect(PERMISSIONS.receptionAttachmentsWrite).toBe(requiredPermissions[1]);
    expect(PERMISSIONS.receptionAttachmentsDelete).toBe(requiredPermissions[2]);
    expect(ALL_PERMISSIONS).toEqual(expect.arrayContaining(requiredPermissions));

    for (const permission of requiredPermissions) {
      expect(PERMISSION_DETAILS[permission]).toEqual({
        description: expect.any(String),
        name: expect.any(String),
      });
    }
  });
});
