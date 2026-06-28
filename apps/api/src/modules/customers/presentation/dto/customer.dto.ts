import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { CustomerSort } from '@unipro-crm/shared-types';

const CUSTOMER_SORT_VALUES: CustomerSort[] = [
  'name',
  'lastPurchase',
  'revenue',
  'ordersCount',
  'firstPurchase',
];

export class CustomerListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasPurchases?: boolean;

  @IsOptional()
  @IsIn(CUSTOMER_SORT_VALUES)
  sort?: CustomerSort;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  sourceId?: string;

  /// YYYY-MM-DD — початок діапазону для агрегатів по документах.
  @IsOptional()
  @IsString()
  from?: string;

  /// YYYY-MM-DD — кінець діапазону (ексклюзивно).
  @IsOptional()
  @IsString()
  to?: string;
}

export class CustomerOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  sourceId?: string;
}

export class CustomerProfileQueryDto {
  @IsOptional()
  @IsString()
  sourceId?: string;
}

export class CustomerMonthlyQueryDto {
  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number;
}
