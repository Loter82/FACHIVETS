-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PLATFORM_ADMIN';

-- AlterTable
ALTER TABLE "data_sources" ADD COLUMN     "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAutoRunAt" TIMESTAMP(3),
ADD COLUMN     "nextScheduledAt" TIMESTAMP(3),
ADD COLUMN     "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "mirror_entities" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "mirror_goods" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "mirror_goods_groups" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "mirror_partner_groups" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "mirror_partners" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "mirror_store_stock" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "mirror_stores" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "mirror_users" ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "sync_cursors" ADD COLUMN     "strategy" TEXT;
