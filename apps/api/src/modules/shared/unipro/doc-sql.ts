import { Prisma } from '@prisma/client';
import { RETAIL_DOC_TYPE, WHOLESALE_DOC_TYPE } from './doc-types';

// Юніпро дублює готівковий продаж двома документами на одну і ту саму суму:
// Видаткова накладна (docType=2, бек-офіс) + Чек (docType=4, РРО). Без
// дедуплікації виторг подвоюється.
//
// На різних інсталяціях зв'язок цих документів кодується по-різному:
//   1) fTreeId    — поле "дерева" документів (зазвичай продаж↔повернення,
//                   але інколи містить пару чек↔накладна).
//   2) fTransactId — фінансовий ID транзакції (часто спільний для пари).
//   3) Якщо обидва порожні — пара впізнається евристично:
//      той самий partnerId, та сама docSum, час відрізняється ≤ 5 хв.
//
// Дедуп: Чек (4) НЕ зараховується у виторг, якщо існує бодай одна паркова
// Видаткова (2, state=0) за будь-яким з трьох критеріїв.
// Самостійні роздрібні чеки (без пари) лишаються в обліку як звичайні
// продажі.

function ref(alias: string, column: string): string {
  return alias ? `${alias}."${column}"` : `"${column}"`;
}

/** Експортовано окремо, щоб мати єдину точку зміни правила пар-дедупа. */
function pairedWholesaleExistsSql(alias: string): string {
  const treeId = ref(alias, 'treeId');
  const transactId = ref(alias, 'transactId');
  const partnerId = ref(alias, 'partnerId');
  const docSum = ref(alias, 'docSum');
  const dateTime = ref(alias, 'dateTime');
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
        OR (
          sib."partnerId" IS NOT NULL
          AND sib."partnerId" = ${partnerId}
          AND sib."docSum" = ${docSum}
          AND ABS(EXTRACT(EPOCH FROM (sib."dateTime" - ${dateTime}))) <= 300
        )
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
