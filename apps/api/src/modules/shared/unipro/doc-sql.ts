import { Prisma } from '@prisma/client';
import { RETAIL_DOC_TYPE, WHOLESALE_DOC_TYPE } from './doc-types';

// Unipro дублює готівковий продаж двома документами на одну й ту саму суму:
// Видаткова накладна (docType=2, бек-офіс) + Чек (docType=4, РРО), пов'язані
// спільним fTreeId. Якщо просто додати обидва — виторг подвоюється.
// Правило дедуплікації: Чек не рахується, якщо для його (tenantId, dataSourceId,
// treeId) існує бодай одна Видаткова. Самостійні роздрібні чеки (treeId
// порожній або без пари) — лишаються в підрахунку.

function ref(alias: string, column: string): string {
  return alias ? `${alias}."${column}"` : `"${column}"`;
}

/** SQL-предикат "цей рядок — зарахований продаж" з дедуплікацією Чек↔Видаткова. */
export function saleDocPredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  const treeId = ref(alias, 'treeId');
  const tenantId = ref(alias, 'tenantId');
  const dsId = ref(alias, 'dataSourceId');
  return Prisma.raw(`(
    ${state} = 0
    AND ${docType} IN (${WHOLESALE_DOC_TYPE}, ${RETAIL_DOC_TYPE})
    AND NOT (
      ${docType} = ${RETAIL_DOC_TYPE}
      AND ${treeId} IS NOT NULL AND ${treeId} <> ''
      AND EXISTS (
        SELECT 1 FROM mirror_documents sib
        WHERE sib."tenantId" = ${tenantId}
          AND sib."dataSourceId" = ${dsId}
          AND sib."treeId" = ${treeId}
          AND sib."docType" = ${WHOLESALE_DOC_TYPE}
          AND sib."state" = 0
      )
    )
  )`);
}

/** SQL-предикат "повернення від клієнта (post)". */
export function returnDocPredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  return Prisma.raw(`(${state} = 0 AND ${docType} = 11)`);
}

/** Лише оптові продажі (Видаткова, без дедуплікації — у неї пари немає). */
export function wholesalePredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  return Prisma.raw(`(${state} = 0 AND ${docType} = ${WHOLESALE_DOC_TYPE})`);
}

/** Лише роздрібні продажі (Чек), теж з відсіюванням Чеків, у яких є парна Видаткова. */
export function retailPredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  const treeId = ref(alias, 'treeId');
  const tenantId = ref(alias, 'tenantId');
  const dsId = ref(alias, 'dataSourceId');
  return Prisma.raw(`(
    ${state} = 0
    AND ${docType} = ${RETAIL_DOC_TYPE}
    AND NOT (
      ${treeId} IS NOT NULL AND ${treeId} <> ''
      AND EXISTS (
        SELECT 1 FROM mirror_documents sib
        WHERE sib."tenantId" = ${tenantId}
          AND sib."dataSourceId" = ${dsId}
          AND sib."treeId" = ${treeId}
          AND sib."docType" = ${WHOLESALE_DOC_TYPE}
          AND sib."state" = 0
      )
    )
  )`);
}
