import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { DashboardPeriod } from '@unipro-crm/shared-types';

const PERIODS: DashboardPeriod[] = ['today', 'week', 'month', 'quarter', 'year', 'all', 'custom'];

export class DashboardOverviewQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: DashboardPeriod;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class DashboardCustomersQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: DashboardPeriod;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

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
}

export class DashboardCustomerItemsQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: DashboardPeriod;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
