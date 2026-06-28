import { Prisma } from '@prisma/client';
import { RETAIL_DOC_TYPE, WHOLESALE_DOC_TYPE } from './doc-types';

// Юніпро дублює готівковий продаж двома документами на ту саму суму:
// Видаткова накладна (docType=2, бек-офіс) + Чек (docType=4, РРО). Без
// дедуплікації виторг подвоюється.
//
// Пара впізнається за двома полями Unipro:
//   1) fTreeId    — дерево документів (часто пара чек↔накладна).
//   2) fTransactId — фінансовий ID транзакції (зазвичай спільний для пари).
//
// Дедуп: Чек (4) НЕ зараховується у виторг, якщо існує парна Видаткова
// (2, state=0) зі співпадінням treeId АБО transactId.
// Самостійні роздрібні чеки (без пари) лишаються в обліку.

function ref(alias: string, column: string): string {
  return alias ? `${alias}."${column}"` : `"${column}"`;
}

function pairedWholesaleExistsSql(alias: string): string {
  const treeId = ref(alias, 'treeId');
  const transactId = ref(alias, 'transactId');
  const tenantId = ref(alias, 'tenantId');
  const dsId = ref(alias, 'dataSourceId');
  return `EXISTS (
    SELECT 1 FROM mirror_documents sib
    WHERE sib."tenantId" = ${tenantId}
      AND sib."dataSourceId" = ${dsId}
      AND sib."docType" = ${WHOLESALE_DOC_TYPE}
      AND sib."state" = 0
      AND (
        (${treeId} IS NOT NULL AND ${treeId} <> '' AND sib."treeId" = ${treeId})
        OR (${transactId} IS NOT NULL AND sib."transactId" = ${transactId})
      )
  )`;
}

/** SQL-предикат "цей рядок — зарахований продаж" з дедуплікацією Чек↔Видаткова. */
export function saleDocPredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  return Prisma.raw(`(
    ${state} = 0
    AND ${docType} IN (${WHOLESALE_DOC_TYPE}, ${RETAIL_DOC_TYPE})
    AND NOT (
      ${docType} = ${RETAIL_DOC_TYPE}
      AND ${pairedWholesaleExistsSql(alias)}
    )
  )`);
}

/** SQL-предикат "повернення від клієнта (post)". */
export function returnDocPredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  return Prisma.raw(`(${state} = 0 AND ${docType} = 11)`);
}

/** Лише оптові продажі (Видаткова, дедуп не потрібен — у неї пари немає). */
export function wholesalePredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  return Prisma.raw(`(${state} = 0 AND ${docType} = ${WHOLESALE_DOC_TYPE})`);
}

/** Лише роздрібні продажі (Чек), з відсіюванням Чеків, у яких є парна Видаткова. */
export function retailPredicateSql(alias = 'd'): Prisma.Sql {
  const state = ref(alias, 'state');
  const docType = ref(alias, 'docType');
  return Prisma.raw(`(
    ${state} = 0
    AND ${docType} = ${RETAIL_DOC_TYPE}
    AND NOT ${pairedWholesaleExistsSql(alias)}
  )`);
}
