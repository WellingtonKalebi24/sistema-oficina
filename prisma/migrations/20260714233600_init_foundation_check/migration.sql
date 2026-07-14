CREATE TABLE "foundation_checks" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foundation_checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "foundation_checks_label_key" ON "foundation_checks"("label");
