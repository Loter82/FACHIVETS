import { IsIn, IsOptional, IsString } from 'class-validator';
import type { DashboardPeriod } from '@unipro-crm/shared-types';

const PERIODS: DashboardPeriod[] = ['today', 'week', 'month', 'quarter', 'year', 'all'];

export class DashboardOverviewQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: DashboardPeriod;

  @IsOptional()
  @IsString()
  sourceId?: string;
}
