ALTER TABLE "company_settings"
ADD COLUMN "quote_discount_warning_percent" DECIMAL(5, 2) NOT NULL DEFAULT 10.00;

CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "check_in_id" TEXT,
    "source_kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Rascunho',
    "diagnosis_problema" TEXT,
    "diagnosis_causa" TEXT,
    "diagnosis_recomendacao" TEXT,
    "valid_until" TIMESTAMP(3),
    "estimated_delivery_at" TIMESTAMP(3),
    "customer_notes" TEXT,
    "internal_notes" TEXT,
    "subtotal_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "surcharge_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "discount_warning_percent" DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    "discount_warning_triggered" BOOLEAN NOT NULL DEFAULT false,
    "discount_warning_message" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quotes_source_kind_check" CHECK ("source_kind" IN ('check-in', 'direct')),
    CONSTRAINT "quotes_status_check" CHECK ("status" IN ('Rascunho', 'Publicado', 'Enviado', 'Expirado', 'Cancelado')),
    CONSTRAINT "quotes_amounts_non_negative_check" CHECK (
        "subtotal_amount" >= 0
        AND "discount_amount" >= 0
        AND "surcharge_amount" >= 0
        AND "total_amount" >= 0
        AND "discount_warning_percent" >= 0
    )
);

CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_items_kind_check" CHECK ("kind" IN ('service', 'product')),
    CONSTRAINT "quote_items_reference_check" CHECK (
        ("kind" = 'service' AND "service_catalog_entry_id" IS NOT NULL AND "product_id" IS NULL)
        OR ("kind" = 'product' AND "product_id" IS NOT NULL AND "service_catalog_entry_id" IS NULL)
    ),
    CONSTRAINT "quote_items_amounts_non_negative_check" CHECK (
        "quantity" > 0
        AND "unit_price" >= 0
        AND "discount_amount" >= 0
        AND "surcharge_amount" >= 0
        AND "total_amount" >= 0
    )
);

CREATE INDEX "quotes_tenant_id_status_updated_at_idx" ON "quotes"("tenant_id", "status", "updated_at");
CREATE INDEX "quotes_tenant_id_customer_id_updated_at_idx" ON "quotes"("tenant_id", "customer_id", "updated_at");
CREATE INDEX "quotes_tenant_id_vehicle_id_updated_at_idx" ON "quotes"("tenant_id", "vehicle_id", "updated_at");
CREATE INDEX "quotes_tenant_id_check_in_id_idx" ON "quotes"("tenant_id", "check_in_id");

CREATE INDEX "quote_items_tenant_id_quote_id_sort_order_idx" ON "quote_items"("tenant_id", "quote_id", "sort_order");
CREATE INDEX "quote_items_tenant_id_kind_idx" ON "quote_items"("tenant_id", "kind");
CREATE INDEX "quote_items_tenant_id_service_catalog_entry_id_idx" ON "quote_items"("tenant_id", "service_catalog_entry_id");
CREATE INDEX "quote_items_tenant_id_product_id_idx" ON "quote_items"("tenant_id", "product_id");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "reception_check_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_service_catalog_entry_id_fkey" FOREIGN KEY ("service_catalog_entry_id") REFERENCES "service_catalog_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
