import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const toInt = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : value;
};

export class StockListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  storeId?: number;

  @ApiPropertyOptional({ enum: ['all', 'in', 'out', 'negative'] })
  @IsOptional()
  @IsIn(['all', 'in', 'out', 'negative'])
  presence?: 'all' | 'in' | 'out' | 'negative';

  @ApiPropertyOptional({ enum: ['name', 'qtty', 'valueCost', 'valueSale', 'margin', 'lastSaleAt'] })
  @IsOptional()
  @IsIn(['name', 'qtty', 'valueCost', 'valueSale', 'margin', 'lastSaleAt'])
  sort?: 'name' | 'qtty' | 'valueCost' | 'valueSale' | 'margin' | 'lastSaleAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class StockSummaryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;
}

export class StockGroupsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  storeId?: number;
}

export class StockAnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  windowDays?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
