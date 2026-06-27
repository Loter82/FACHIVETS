-- CreateEnum
CREATE TYPE "SyncEntity" AS ENUM ('ENTITIES', 'STORES', 'USERS', 'PARTNER_GROUPS', 'PARTNERS', 'GOODS_GROUPS', 'GOODS', 'DOCUMENTS', 'DOCUMENT_ITEMS', 'PAYMENTS');

-- CreateTable
CREATE TABLE "sync_cursors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "entity" "SyncEntity" NOT NULL,
    "watermarkHex" TEXT,
    "watermarkInt" BIGINT,
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_entities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "namePrint" TEXT,
    "edrpou" TEXT,
    "inn" TEXT,
    "ndsn" TEXT,
    "tel" TEXT,
    "address" TEXT,
    "state" INTEGER,
    "groupId" INTEGER,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_stores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "namePrint" TEXT,
    "address" TEXT,
    "state" INTEGER,
    "groupId" INTEGER,
    "priceId" INTEGER,
    "priceId2" INTEGER,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "namePrint" TEXT,
    "cardNumber" TEXT,
    "state" INTEGER,
    "groupId" INTEGER,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_partner_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "name" TEXT,
    "cl" INTEGER,
    "cr" INTEGER,
    "clev" INTEGER,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_partner_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_partners" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "namePrint" TEXT,
    "cardNumber" TEXT,
    "phones" JSONB NOT NULL DEFAULT '[]',
    "addresses" JSONB NOT NULL DEFAULT '[]',
    "dates" JSONB NOT NULL DEFAULT '[]',
    "edrpou" TEXT,
    "inn" TEXT,
    "description" TEXT,
    "state" INTEGER,
    "groupId" INTEGER,
    "displayName" TEXT,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_goods_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "name" TEXT,
    "cl" INTEGER,
    "cr" INTEGER,
    "clev" INTEGER,
    "markUp" DOUBLE PRECISION,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_goods_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_goods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "nameFull" TEXT,
    "description" TEXT,
    "barcodes" JSONB NOT NULL DEFAULT '[]',
    "unitType" TEXT,
    "unitType2" TEXT,
    "unitType3" TEXT,
    "coeff2" DOUBLE PRECISION,
    "coeff3" DOUBLE PRECISION,
    "type" INTEGER,
    "vatGroup" INTEGER,
    "visible" INTEGER,
    "deleted" INTEGER,
    "groupId" INTEGER,
    "priceIn" DOUBLE PRECISION,
    "priceOut" DOUBLE PRECISION,
    "pricesExtra" JSONB NOT NULL DEFAULT '[]',
    "minCount" DOUBLE PRECISION,
    "nomCount" DOUBLE PRECISION,
    "mainPartner" INTEGER,
    "customFields" JSONB NOT NULL DEFAULT '[]',
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" BIGINT NOT NULL,
    "extGuid1" BIGINT NOT NULL,
    "extGuid2" BIGINT NOT NULL,
    "docNum" BIGINT,
    "docType" INTEGER NOT NULL,
    "state" INTEGER NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "realDateTime" TIMESTAMP(3),
    "inputNum" TEXT,
    "inputDate" TIMESTAMP(3),
    "docSum" DOUBLE PRECISION,
    "currId" INTEGER,
    "currRate" DOUBLE PRECISION,
    "entityId" INTEGER,
    "partnerId" INTEGER,
    "storeId" INTEGER,
    "storeId2" INTEGER,
    "userId" INTEGER,
    "realUserId" INTEGER,
    "salePId" INTEGER,
    "contractId" INTEGER,
    "cashAccountId" INTEGER,
    "payCardId" INTEGER,
    "treeId" TEXT,
    "description" TEXT,
    "itemCost" INTEGER,
    "transactId" BIGINT,
    "pr" INTEGER,
    "isPaid" INTEGER,
    "tableId" INTEGER,
    "prroDate" INTEGER,
    "prroFn" TEXT,
    "prroRealDate" TIMESTAMP(3),
    "rvHex" TEXT NOT NULL,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_document_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" BIGINT NOT NULL,
    "externalDocId" BIGINT NOT NULL,
    "externalGoodId" BIGINT NOT NULL,
    "qtty" DOUBLE PRECISION NOT NULL,
    "priceIn" DOUBLE PRECISION NOT NULL,
    "priceOut" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "sum" DOUBLE PRECISION NOT NULL,
    "vatSum" DOUBLE PRECISION NOT NULL,
    "currId" INTEGER,
    "unitType" INTEGER,
    "typeInDoc" INTEGER,
    "parentGoodId" INTEGER,
    "posId" INTEGER,
    "mark" INTEGER,
    "couponCode" TEXT,
    "exStamp" TEXT,
    "description" TEXT,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mirror_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_cursors_tenantId_dataSourceId_idx" ON "sync_cursors"("tenantId", "dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_cursors_tenantId_dataSourceId_entity_key" ON "sync_cursors"("tenantId", "dataSourceId", "entity");

-- CreateIndex
CREATE INDEX "mirror_entities_tenantId_dataSourceId_idx" ON "mirror_entities"("tenantId", "dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_entities_tenantId_dataSourceId_externalId_key" ON "mirror_entities"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_stores_tenantId_dataSourceId_idx" ON "mirror_stores"("tenantId", "dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_stores_tenantId_dataSourceId_externalId_key" ON "mirror_stores"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_users_tenantId_dataSourceId_idx" ON "mirror_users"("tenantId", "dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_users_tenantId_dataSourceId_externalId_key" ON "mirror_users"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_partner_groups_tenantId_dataSourceId_idx" ON "mirror_partner_groups"("tenantId", "dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_partner_groups_tenantId_dataSourceId_externalId_key" ON "mirror_partner_groups"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_partners_tenantId_dataSourceId_idx" ON "mirror_partners"("tenantId", "dataSourceId");

-- CreateIndex
CREATE INDEX "mirror_partners_tenantId_dataSourceId_groupId_idx" ON "mirror_partners"("tenantId", "dataSourceId", "groupId");

-- CreateIndex
CREATE INDEX "mirror_partners_tenantId_dataSourceId_cardNumber_idx" ON "mirror_partners"("tenantId", "dataSourceId", "cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_partners_tenantId_dataSourceId_externalId_key" ON "mirror_partners"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_goods_groups_tenantId_dataSourceId_idx" ON "mirror_goods_groups"("tenantId", "dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_goods_groups_tenantId_dataSourceId_externalId_key" ON "mirror_goods_groups"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_goods_tenantId_dataSourceId_idx" ON "mirror_goods"("tenantId", "dataSourceId");

-- CreateIndex
CREATE INDEX "mirror_goods_tenantId_dataSourceId_groupId_idx" ON "mirror_goods"("tenantId", "dataSourceId", "groupId");

-- CreateIndex
CREATE INDEX "mirror_goods_tenantId_dataSourceId_code_idx" ON "mirror_goods"("tenantId", "dataSourceId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_goods_tenantId_dataSourceId_externalId_key" ON "mirror_goods"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_documents_tenantId_dataSourceId_docType_dateTime_idx" ON "mirror_documents"("tenantId", "dataSourceId", "docType", "dateTime");

-- CreateIndex
CREATE INDEX "mirror_documents_tenantId_dataSourceId_partnerId_idx" ON "mirror_documents"("tenantId", "dataSourceId", "partnerId");

-- CreateIndex
CREATE INDEX "mirror_documents_tenantId_dataSourceId_storeId_idx" ON "mirror_documents"("tenantId", "dataSourceId", "storeId");

-- CreateIndex
CREATE INDEX "mirror_documents_tenantId_dataSourceId_rvHex_idx" ON "mirror_documents"("tenantId", "dataSourceId", "rvHex");

-- CreateIndex
CREATE INDEX "mirror_documents_tenantId_dataSourceId_treeId_idx" ON "mirror_documents"("tenantId", "dataSourceId", "treeId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_documents_tenantId_dataSourceId_externalId_key" ON "mirror_documents"("tenantId", "dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "mirror_document_items_tenantId_dataSourceId_externalDocId_idx" ON "mirror_document_items"("tenantId", "dataSourceId", "externalDocId");

-- CreateIndex
CREATE INDEX "mirror_document_items_tenantId_dataSourceId_externalGoodId_idx" ON "mirror_document_items"("tenantId", "dataSourceId", "externalGoodId");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_document_items_tenantId_dataSourceId_externalId_key" ON "mirror_document_items"("tenantId", "dataSourceId", "externalId");
