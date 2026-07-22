CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "source_kind" TEXT NOT NULL,
    "source_id" TEXT,
    "source_label" TEXT,
    "source_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by_user_id" TEXT,
    "cancelled_by_user_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_reservations_tenant_id_status_created_at_idx" ON "stock_reservations"("tenant_id", "status", "created_at");
CREATE INDEX "stock_reservations_tenant_id_product_id_status_idx" ON "stock_reservations"("tenant_id", "product_id", "status");
CREATE INDEX "stock_reservations_tenant_id_source_kind_source_id_idx" ON "stock_reservations"("tenant_id", "source_kind", "source_id");

ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
