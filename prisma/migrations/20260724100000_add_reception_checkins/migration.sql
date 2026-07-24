-- CreateTable
CREATE TABLE "reception_check_ins" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL,
    "fuel_level" TEXT NOT NULL,
    "damage_notes" TEXT NOT NULL,
    "mileage" INTEGER,
    "items_left" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aguardando diagnostico',
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reception_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_checklist_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "check_in_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reception_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reception_check_ins_appointment_id_key" ON "reception_check_ins"("appointment_id");

-- CreateIndex
CREATE INDEX "reception_check_ins_tenant_id_entered_at_idx" ON "reception_check_ins"("tenant_id", "entered_at");

-- CreateIndex
CREATE INDEX "reception_check_ins_tenant_id_status_entered_at_idx" ON "reception_check_ins"("tenant_id", "status", "entered_at");

-- CreateIndex
CREATE INDEX "reception_check_ins_tenant_id_customer_id_entered_at_idx" ON "reception_check_ins"("tenant_id", "customer_id", "entered_at");

-- CreateIndex
CREATE INDEX "reception_check_ins_tenant_id_vehicle_id_entered_at_idx" ON "reception_check_ins"("tenant_id", "vehicle_id", "entered_at");

-- CreateIndex
CREATE INDEX "reception_checklist_items_tenant_id_check_in_id_idx" ON "reception_checklist_items"("tenant_id", "check_in_id");

-- CreateIndex
CREATE INDEX "reception_checklist_items_tenant_id_label_idx" ON "reception_checklist_items"("tenant_id", "label");

-- AddForeignKey
ALTER TABLE "reception_check_ins" ADD CONSTRAINT "reception_check_ins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_check_ins" ADD CONSTRAINT "reception_check_ins_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_check_ins" ADD CONSTRAINT "reception_check_ins_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_check_ins" ADD CONSTRAINT "reception_check_ins_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_check_ins" ADD CONSTRAINT "reception_check_ins_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_check_ins" ADD CONSTRAINT "reception_check_ins_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_checklist_items" ADD CONSTRAINT "reception_checklist_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_checklist_items" ADD CONSTRAINT "reception_checklist_items_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "reception_check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
