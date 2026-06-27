/**
 * UniproMapper — pure-функції, що конвертують MSSQL-рядки Unipro
 * у DTO для запису в mirror-таблиці Postgres.
 *
 * Усі назви колонок з префіксом `f` (fId, fName, fGUID1...).
 * GUID Unipro зберігається у БД як пара bigint (fGUID1, fGUID2).
 * Reference-поля використовують int fId (НЕ guid).
 *
 * Mapper не виконує валідацію (це робить шар вище), не звертається до БД
 * і не кидає винятків окрім логічних (наприклад відсутність обов'язкового поля).
 */

import type { Prisma } from '@prisma/client';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;

const toBig = (v: unknown): bigint => {
  if (v === null || v === undefined) return 0n;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(Math.trunc(v));
  if (typeof v === 'string') return BigInt(v);
  if (v instanceof Buffer) return BigInt('0x' + v.toString('hex'));
  return 0n;
};

const toInt = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.trunc(v);
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const toFloat = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
};

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Перетворити SQL Server rowversion (Buffer 8 байт) на hex-рядок. */
const rvToHex = (v: unknown): string => {
  if (!v) return '';
  if (v instanceof Buffer) return '0x' + v.toString('hex').toUpperCase();
  if (typeof v === 'string') return v;
  return String(v);
};

/** payload — повна копія рядка для traceability. BigInt серіалізуємо як рядки. */
const toPayload = (row: Row): Prisma.InputJsonValue => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = null;
    } else if (typeof v === 'bigint') {
      out[k] = v.toString();
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (v instanceof Buffer) {
      out[k] = '0x' + v.toString('hex');
    } else {
      out[k] = v;
    }
  }
  return out as Prisma.InputJsonValue;
};

const collectArr = (row: Row, keys: string[], transform: (v: unknown) => unknown = (x) => x): unknown[] => {
  const out: unknown[] = [];
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      out.push(transform(v));
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export interface MapperCtx {
  tenantId: string;
  dataSourceId: string;
}

export interface MirrorEntityInput {
  tenantId: string;
  dataSourceId: string;
  externalId: number;
  extGuid1: bigint;
  extGuid2: bigint;
  code: string | null;
  name: string | null;
  namePrint: string | null;
  edrpou: string | null;
  inn: string | null;
  ndsn: string | null;
  tel: string | null;
  address: string | null;
  state: number | null;
  groupId: number | null;
  payload: Prisma.InputJsonValue;
}

export function mapEntity(ctx: MapperCtx, row: Row): MirrorEntityInput {
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toInt(row.fId) ?? 0,
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    code: toStr(row.fCode),
    name: toStr(row.fName),
    namePrint: toStr(row.fNamePrint),
    edrpou: toStr(row.fEDRPOU),
    inn: toStr(row.fINN),
    ndsn: toStr(row.fNDSN),
    tel: toStr(row.fTel),
    address: toStr(row.fAdress),
    state: toInt(row.fState),
    groupId: toInt(row.fGroupID),
    payload: toPayload(row),
  };
}

export interface MirrorStoreInput {
  tenantId: string;
  dataSourceId: string;
  externalId: number;
  extGuid1: bigint;
  extGuid2: bigint;
  code: string | null;
  name: string | null;
  namePrint: string | null;
  address: string | null;
  state: number | null;
  groupId: number | null;
  priceId: number | null;
  priceId2: number | null;
  payload: Prisma.InputJsonValue;
}

export function mapStore(ctx: MapperCtx, row: Row): MirrorStoreInput {
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toInt(row.fId) ?? 0,
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    code: toStr(row.fCode),
    name: toStr(row.fName),
    namePrint: toStr(row.fNamePrint),
    address: toStr(row.fAdress),
    state: toInt(row.fState),
    groupId: toInt(row.fGroupID),
    priceId: toInt(row.fPriceId),
    priceId2: toInt(row.fPriceId2),
    payload: toPayload(row),
  };
}

export interface MirrorUserInput {
  tenantId: string;
  dataSourceId: string;
  externalId: number;
  extGuid1: bigint;
  extGuid2: bigint;
  code: string | null;
  name: string | null;
  namePrint: string | null;
  cardNumber: string | null;
  state: number | null;
  groupId: number | null;
  payload: Prisma.InputJsonValue;
}

export function mapUser(ctx: MapperCtx, row: Row): MirrorUserInput {
  // Прибираємо паролі з payload — вони не повинні потрапити в Postgres.
  const safeRow: Row = { ...row };
  delete safeRow.fPassword;
  delete safeRow.fPassword2;
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toInt(row.fId) ?? 0,
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    code: toStr(row.fCode),
    name: toStr(row.fName),
    namePrint: toStr(row.fNamePrint),
    cardNumber: toStr(row.fCardNumber),
    state: toInt(row.fState),
    groupId: toInt(row.fGroupID),
    payload: toPayload(safeRow),
  };
}

export interface MirrorPartnerGroupInput {
  tenantId: string;
  dataSourceId: string;
  externalId: number;
  extGuid1: bigint;
  extGuid2: bigint;
  name: string | null;
  cl: number | null;
  cr: number | null;
  clev: number | null;
  payload: Prisma.InputJsonValue;
}

export function mapPartnerGroup(ctx: MapperCtx, row: Row): MirrorPartnerGroupInput {
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toInt(row.fId) ?? 0,
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    name: toStr(row.fName),
    cl: toInt(row.fcl),
    cr: toInt(row.fcr),
    clev: toInt(row.fclev),
    payload: toPayload(row),
  };
}

export interface MirrorPartnerInput {
  tenantId: string;
  dataSourceId: string;
  externalId: number;
  extGuid1: bigint;
  extGuid2: bigint;
  code: string | null;
  name: string | null;
  namePrint: string | null;
  cardNumber: string | null;
  phones: Prisma.InputJsonValue;
  addresses: Prisma.InputJsonValue;
  dates: Prisma.InputJsonValue;
  edrpou: string | null;
  inn: string | null;
  description: string | null;
  state: number | null;
  groupId: number | null;
  displayName: string | null;
  payload: Prisma.InputJsonValue;
}

export function mapPartner(ctx: MapperCtx, row: Row): MirrorPartnerInput {
  const phones = collectArr(row, ['fTel', 'fTel1', 'fTel2', 'fTel3', 'fTel4', 'fTel5'], (v) =>
    String(v).trim(),
  );
  const addresses = collectArr(row, ['fAdress', 'fAdress1', 'fAdress2'], (v) => String(v).trim());
  const dates = collectArr(row, ['fDate', 'fDate1', 'fDate2', 'fDate3', 'fDate4', 'fDate5'], (v) =>
    v instanceof Date ? v.toISOString() : String(v),
  );
  const display = toStr(row.fName) ?? toStr(row.fNamePrint) ?? toStr(row.fCode);
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toInt(row.fId) ?? 0,
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    code: toStr(row.fCode),
    name: toStr(row.fName),
    namePrint: toStr(row.fNamePrint),
    cardNumber: toStr(row.fCardNumber),
    phones: phones as Prisma.InputJsonValue,
    addresses: addresses as Prisma.InputJsonValue,
    dates: dates as Prisma.InputJsonValue,
    edrpou: toStr(row.fEDRPOU),
    inn: toStr(row.fINN),
    description: toStr(row.fDesc),
    state: toInt(row.fState),
    groupId: toInt(row.fGroupID),
    displayName: display,
    payload: toPayload(row),
  };
}

export interface MirrorGoodsGroupInput {
  tenantId: string;
  dataSourceId: string;
  externalId: number;
  extGuid1: bigint;
  extGuid2: bigint;
  name: string | null;
  cl: number | null;
  cr: number | null;
  clev: number | null;
  markUp: number | null;
  payload: Prisma.InputJsonValue;
}

export function mapGoodsGroup(ctx: MapperCtx, row: Row): MirrorGoodsGroupInput {
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toInt(row.fId) ?? 0,
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    name: toStr(row.fName),
    cl: toInt(row.fcl),
    cr: toInt(row.fcr),
    clev: toInt(row.fclev),
    markUp: toFloat(row.fMarkUp),
    payload: toPayload(row),
  };
}

export interface MirrorGoodInput {
  tenantId: string;
  dataSourceId: string;
  externalId: number;
  extGuid1: bigint;
  extGuid2: bigint;
  code: string | null;
  name: string | null;
  nameFull: string | null;
  description: string | null;
  barcodes: Prisma.InputJsonValue;
  unitType: string | null;
  unitType2: string | null;
  unitType3: string | null;
  coeff2: number | null;
  coeff3: number | null;
  type: number | null;
  vatGroup: number | null;
  visible: number | null;
  deleted: number | null;
  groupId: number | null;
  priceIn: number | null;
  priceOut: number | null;
  pricesExtra: Prisma.InputJsonValue;
  minCount: number | null;
  nomCount: number | null;
  mainPartner: number | null;
  customFields: Prisma.InputJsonValue;
  payload: Prisma.InputJsonValue;
}

export function mapGood(ctx: MapperCtx, row: Row): MirrorGoodInput {
  const barcodes: string[] = [];
  for (const k of ['fBarCode', 'fBarCode2', 'fBarCode3']) {
    const v = toStr(row[k]);
    if (v) barcodes.push(v);
  }
  const list = toStr(row.fBarCodeList);
  if (list) {
    for (const part of list.split(/[;,\s]+/)) {
      const trimmed = part.trim();
      if (trimmed && !barcodes.includes(trimmed)) barcodes.push(trimmed);
    }
  }
  const pricesExtra: Array<{ level: number; price: number }> = [];
  for (let i = 2; i <= 10; i += 1) {
    const v = toFloat(row[`fPriceOut${i}`]);
    if (v !== null) pricesExtra.push({ level: i, price: v });
  }
  const customFields: Array<{ key: string; value: string }> = [];
  for (const k of ['fpdop1', 'fpdop2', 'fpdop3', 'fpdop4']) {
    const v = toStr(row[k]);
    if (v) customFields.push({ key: k, value: v });
  }

  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toInt(row.fId) ?? 0,
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    code: toStr(row.fCode),
    name: toStr(row.fName),
    nameFull: toStr(row.fNameFull),
    description: toStr(row.fDesc),
    barcodes: barcodes as Prisma.InputJsonValue,
    unitType: toStr(row.fUnitType),
    unitType2: toStr(row.fUnitType2),
    unitType3: toStr(row.fUnitType3),
    coeff2: toFloat(row.fCoeff2),
    coeff3: toFloat(row.fCoeff3),
    type: toInt(row.fType),
    vatGroup: toInt(row.fVATGroup),
    visible: toInt(row.fVisible),
    deleted: toInt(row.fDeleted),
    groupId: toInt(row.fGroupID),
    priceIn: toFloat(row.fPriceIn),
    priceOut: toFloat(row.fPriceOut1),
    pricesExtra: pricesExtra as Prisma.InputJsonValue,
    minCount: toFloat(row.fMinCount),
    nomCount: toFloat(row.fNomCount),
    mainPartner: toInt(row.fMainPartner),
    customFields: customFields as Prisma.InputJsonValue,
    payload: toPayload(row),
  };
}

export interface MirrorDocumentInput {
  tenantId: string;
  dataSourceId: string;
  externalId: bigint;
  extGuid1: bigint;
  extGuid2: bigint;
  docNum: bigint | null;
  docType: number;
  state: number;
  dateTime: Date;
  realDateTime: Date | null;
  inputNum: string | null;
  inputDate: Date | null;
  docSum: number | null;
  currId: number | null;
  currRate: number | null;
  entityId: number | null;
  partnerId: number | null;
  storeId: number | null;
  storeId2: number | null;
  userId: number | null;
  realUserId: number | null;
  salePId: number | null;
  contractId: number | null;
  cashAccountId: number | null;
  payCardId: number | null;
  treeId: string | null;
  description: string | null;
  itemCost: number | null;
  transactId: bigint | null;
  pr: number | null;
  isPaid: number | null;
  tableId: number | null;
  prroDate: number | null;
  prroFn: string | null;
  prroRealDate: Date | null;
  rvHex: string;
  itemsCount: number;
  payload: Prisma.InputJsonValue;
}

export function mapDocument(ctx: MapperCtx, row: Row): MirrorDocumentInput {
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toBig(row.fId),
    extGuid1: toBig(row.fGUID1),
    extGuid2: toBig(row.fGUID2),
    docNum: row.fDocNum != null ? toBig(row.fDocNum) : null,
    docType: toInt(row.fDocType) ?? 0,
    state: toInt(row.fState) ?? 0,
    dateTime: toDate(row.fDateTime) ?? new Date(0),
    realDateTime: toDate(row.fRealDateTime),
    inputNum: toStr(row.fInputNum),
    inputDate: toDate(row.fInputDate),
    docSum: toFloat(row.fDocSum),
    currId: toInt(row.fCurrId),
    currRate: toFloat(row.fCurrRate),
    entityId: toInt(row.fEntityId),
    partnerId: toInt(row.fPartnerId),
    storeId: toInt(row.fStoreId),
    storeId2: toInt(row.fStoreId2),
    userId: toInt(row.fUserId),
    realUserId: toInt(row.fRealUserId),
    salePId: toInt(row.fSalePId),
    contractId: toInt(row.fContractId),
    cashAccountId: toInt(row.fCashAccountId),
    payCardId: toInt(row.fPayCardId),
    treeId: toStr(row.fTreeId),
    description: toStr(row.fDesc),
    itemCost: toInt(row.fItemCost),
    transactId: row.fTransactId != null ? toBig(row.fTransactId) : null,
    pr: toInt(row.fPr),
    isPaid: toInt(row.fIsPaid),
    tableId: toInt(row.fTableId),
    prroDate: toInt(row.fPRRODate),
    prroFn: toStr(row.fPRROFN),
    prroRealDate: toDate(row.fPRRORealDate),
    rvHex: rvToHex(row.fRV),
    itemsCount: 0, // обчислюється окремо при INSERT/UPSERT
    payload: toPayload(row),
  };
}

export interface MirrorDocumentItemInput {
  tenantId: string;
  dataSourceId: string;
  externalId: bigint;
  externalDocId: bigint;
  externalGoodId: bigint;
  qtty: number;
  priceIn: number;
  priceOut: number;
  discount: number;
  sum: number;
  vatSum: number;
  currId: number | null;
  unitType: number | null;
  typeInDoc: number | null;
  parentGoodId: number | null;
  posId: number | null;
  mark: number | null;
  couponCode: string | null;
  exStamp: string | null;
  description: string | null;
  payload: Prisma.InputJsonValue;
}

export function mapDocumentItem(ctx: MapperCtx, row: Row): MirrorDocumentItemInput {
  return {
    tenantId: ctx.tenantId,
    dataSourceId: ctx.dataSourceId,
    externalId: toBig(row.fId),
    externalDocId: toBig(row.fDocId),
    externalGoodId: toBig(row.fGoodId),
    qtty: toFloat(row.fQtty) ?? 0,
    priceIn: toFloat(row.fPriceIn) ?? 0,
    priceOut: toFloat(row.fPriceOut) ?? 0,
    discount: toFloat(row.fDiscount) ?? 0,
    sum: toFloat(row.fSum) ?? 0,
    vatSum: toFloat(row.fVatSum) ?? 0,
    currId: toInt(row.fCurrId),
    unitType: toInt(row.fUnitType),
    typeInDoc: toInt(row.fTypeInDoc),
    parentGoodId: toInt(row.fParentGoodId),
    posId: toInt(row.fPosId),
    mark: toInt(row.fMark),
    couponCode: toStr(row.fCouponCode),
    exStamp: toStr(row.fExStamp),
    description: toStr(row.fDesc),
    payload: toPayload(row),
  };
}
