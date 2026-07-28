ALTER TABLE "quotes"
ADD COLUMN "current_version_id" TEXT;

CREATE TABLE "quote_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Publicado',
    "source_kind" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "check_in_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_document" TEXT,
    "customer_phone" TEXT,
    "customer_email" TEXT,
    "vehicle_label" TEXT NOT NULL,
    "vehicle_plate" TEXT,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_year" INTEGER,
    "workshop_legal_name" TEXT,
    "workshop_trade_name" TEXT NOT NULL,
    "workshop_document" TEXT,
    "diagnosis_problema" TEXT,
    "diagnosis_causa" TEXT,
    "diagnosis_recomendacao" TEXT,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "estimated_delivery_at" TIMESTAMP(3),
    "customer_notes" TEXT,
    "subtotal_amount" DECIMAL(12, 2) NOT NULL,
    "discount_amount" DECIMAL(12, 2) NOT NULL,
    "surcharge_amount" DECIMAL(12, 2) NOT NULL,
    "total_amount" DECIMAL(12, 2) NOT NULL,
    "discount_warning_percent" DECIMAL(5, 2) NOT NULL,
    "discount_warning_triggered" BOOLEAN NOT NULL DEFAULT false,
    "discount_warning_message" TEXT,
    "published_by_user_id" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_changed_by_user_id" TEXT,
    "status_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_versions_source_kind_check" CHECK ("source_kind" IN ('check-in', 'direct')),
    CONSTRAINT "quote_versions_status_check" CHECK ("status" IN ('Publicado', 'Enviado', 'Expirado', 'Cancelado')),
    CONSTRAINT "quote_versions_amounts_non_negative_check" CHECK (
        "subtotal_amount" >= 0
        AND "discount_amount" >= 0
        AND "surcharge_amount" >= 0
        AND "total_amount" >= 0
        AND "discount_warning_percent" >= 0
    )
);

CREATE TABLE "quote_version_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quote_version_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "service_catalog_entry_id" TEXT,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12, 3) NOT NULL,
    "unit_price" DECIMAL(12, 2) NOT NULL,
    "discount_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "surcharge_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_version_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_version_items_kind_check" CHECK ("kind" IN ('service', 'product')),
    CONSTRAINT "quote_version_items_reference_check" CHECK (
        ("kind" = 'service' AND "service_catalog_entry_id" IS NOT NULL AND "product_id" IS NULL)
        OR ("kind" = 'product' AND "product_id" IS NOT NULL AND "service_catalog_entry_id" IS NULL)
    ),
    CONSTRAINT "quote_version_items_amounts_non_negative_check" CHECK (
        "quantity" > 0
        AND "unit_price" >= 0
        AND "discount_amount" >= 0
        AND "surcharge_amount" >= 0
        AND "total_amount" >= 0
    )
);

CREATE TABLE "quote_approval_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quote_version_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_approval_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quote_versions_quote_id_version_number_key" ON "quote_versions"("quote_id", "version_number");
CREATE INDEX "quotes_tenant_id_current_version_id_idx" ON "quotes"("tenant_id", "current_version_id");
CREATE INDEX "quote_versions_tenant_id_quote_id_version_number_idx" ON "quote_versions"("tenant_id", "quote_id", "version_number");
CREATE INDEX "quote_versions_tenant_id_status_published_at_idx" ON "quote_versions"("tenant_id", "status", "published_at");
CREATE INDEX "quote_version_items_tenant_id_quote_version_id_sort_order_idx" ON "quote_version_items"("tenant_id", "quote_version_id", "sort_order");
CREATE INDEX "quote_version_items_tenant_id_kind_idx" ON "quote_version_items"("tenant_id", "kind");
CREATE INDEX "quote_version_items_tenant_id_service_catalog_entry_id_idx" ON "quote_version_items"("tenant_id", "service_catalog_entry_id");
CREATE INDEX "quote_version_items_tenant_id_product_id_idx" ON "quote_version_items"("tenant_id", "product_id");
CREATE UNIQUE INDEX "quote_approval_links_token_hash_key" ON "quote_approval_links"("token_hash");
CREATE INDEX "quote_approval_links_tenant_id_quote_version_id_created_at_idx" ON "quote_approval_links"("tenant_id", "quote_version_id", "created_at");
CREATE INDEX "quote_approval_links_tenant_id_expires_at_idx" ON "quote_approval_links"("tenant_id", "expires_at");

ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_version_items" ADD CONSTRAINT "quote_version_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_version_items" ADD CONSTRAINT "quote_version_items_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_version_items" ADD CONSTRAINT "quote_version_items_service_catalog_entry_id_fkey" FOREIGN KEY ("service_catalog_entry_id") REFERENCES "service_catalog_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_version_items" ADD CONSTRAINT "quote_version_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_approval_links" ADD CONSTRAINT "quote_approval_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_approval_links" ADD CONSTRAINT "quote_approval_links_quote_version_id_fkey" FOREIGN KEY ("quote_version_id") REFERENCES "quote_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_approval_links" ADD CONSTRAINT "quote_approval_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "quote_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
