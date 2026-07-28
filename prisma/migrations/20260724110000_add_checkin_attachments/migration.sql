-- CreateTable
CREATE TABLE "check_in_attachments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "check_in_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_in_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "check_in_attachments_category_check" CHECK ("category" IN ('Avaria', 'Documento', 'Painel', 'Motor', 'Interior', 'Outro')),
    CONSTRAINT "check_in_attachments_size_bytes_check" CHECK ("size_bytes" >= 0)
);

-- CreateIndex
CREATE INDEX "check_in_attachments_tenant_id_check_in_id_deleted_at_idx" ON "check_in_attachments"("tenant_id", "check_in_id", "deleted_at");

-- CreateIndex
CREATE INDEX "check_in_attachments_tenant_id_category_idx" ON "check_in_attachments"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "check_in_attachments_tenant_id_deleted_at_idx" ON "check_in_attachments"("tenant_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "check_in_attachments" ADD CONSTRAINT "check_in_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_attachments" ADD CONSTRAINT "check_in_attachments_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "reception_check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_attachments" ADD CONSTRAINT "check_in_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_attachments" ADD CONSTRAINT "check_in_attachments_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
