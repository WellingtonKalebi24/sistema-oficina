-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "document_normalized" TEXT,
    "document_type" TEXT,
    "phone" TEXT,
    "phone_normalized" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_user_id" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plate" TEXT,
    "plate_normalized" TEXT,
    "vin" TEXT,
    "vin_normalized" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "mileage" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_user_id" TEXT,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_vehicle_history_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "vehicle_id" TEXT,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_vehicle_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_tenant_id_deleted_at_idx" ON "customers"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "customers_tenant_id_name_idx" ON "customers"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "customers_tenant_id_document_normalized_idx" ON "customers"("tenant_id", "document_normalized");

-- CreateIndex
CREATE INDEX "customers_tenant_id_phone_normalized_idx" ON "customers"("tenant_id", "phone_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_document_active_key"
    ON "customers"("tenant_id", "document_normalized")
    WHERE "deleted_at" IS NULL AND "document_normalized" IS NOT NULL;

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_deleted_at_idx" ON "vehicles"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_customer_id_idx" ON "vehicles"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_plate_normalized_idx" ON "vehicles"("tenant_id", "plate_normalized");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_vin_normalized_idx" ON "vehicles"("tenant_id", "vin_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_tenant_plate_active_key"
    ON "vehicles"("tenant_id", "plate_normalized")
    WHERE "deleted_at" IS NULL AND "plate_normalized" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_tenant_vin_active_key"
    ON "vehicles"("tenant_id", "vin_normalized")
    WHERE "deleted_at" IS NULL AND "vin_normalized" IS NOT NULL;

-- CreateIndex
CREATE INDEX "customer_vehicle_history_events_tenant_id_created_at_idx" ON "customer_vehicle_history_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_vehicle_history_events_customer_id_created_at_idx" ON "customer_vehicle_history_events"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_vehicle_history_events_vehicle_id_created_at_idx" ON "customer_vehicle_history_events"("vehicle_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_vehicle_history_events_type_idx" ON "customer_vehicle_history_events"("type");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicle_history_events" ADD CONSTRAINT "customer_vehicle_history_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicle_history_events" ADD CONSTRAINT "customer_vehicle_history_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicle_history_events" ADD CONSTRAINT "customer_vehicle_history_events_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicle_history_events" ADD CONSTRAINT "customer_vehicle_history_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
