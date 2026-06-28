-- Index for chek↔videatkova dedup EXISTS subquery (matches on transactId).
CREATE INDEX IF NOT EXISTS "mirror_documents_tenantId_dataSourceId_transactId_idx"
  ON "mirror_documents" ("tenantId", "dataSourceId", "transactId");
