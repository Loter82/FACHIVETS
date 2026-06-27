-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('UNIPRO_MSSQL', 'UNIPRO_JSON_AGENT');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('TEST_CONNECTION', 'FULL_SYNC', 'INCREMENTAL_SYNC', 'ENTITY_SYNC');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'DRAFT',
    "credentialsCipher" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "lastTestedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "type" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "entity" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsWritten" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_sources_tenantId_idx" ON "data_sources"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_tenantId_name_key" ON "data_sources"("tenantId", "name");

-- CreateIndex
CREATE INDEX "sync_jobs_tenantId_dataSourceId_createdAt_idx" ON "sync_jobs"("tenantId", "dataSourceId", "createdAt");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
