-- AlterEnum
ALTER TYPE "SyncEntity" ADD VALUE 'STORE_STOCK';

-- CreateTable
CREATE TABLE "mirror_store_stock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" BIGINT NOT NULL,
    "entId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "goodId" INTEGER NOT NULL,
    "qtty" DOUBLE PRECISION NOT NULL,
    "sum" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mirror_store_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mirror_store_stock_tenantId_dataSourceId_goodId_idx" ON "mirror_store_stock"("tenantId", "dataSourceId", "goodId");

-- CreateIndex
CREATE INDEX "mirror_store_stock_tenantId_dataSourceId_storeId_goodId_idx" ON "mirror_store_stock"("tenantId", "dataSourceId", "storeId", "goodId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_store_stock_tenantId_dataSourceId_externalId_key" ON "mirror_store_stock"("tenantId", "dataSourceId", "externalId");
