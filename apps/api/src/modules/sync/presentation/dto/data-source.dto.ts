import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

export enum DataSourceTypeDto {
  UNIPRO_MSSQL = 'UNIPRO_MSSQL',
  UNIPRO_JSON_AGENT = 'UNIPRO_JSON_AGENT',
}

export class MssqlCredentialsDto {
  @ApiProperty() @IsString() host!: string;
  @ApiProperty({ default: 1433 }) @IsInt() @Min(1) @Max(65535) port!: number;
  @ApiProperty() @IsString() database!: string;
  @ApiProperty() @IsString() user!: string;
  @ApiProperty() @IsString() password!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instance?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() encrypt?: boolean;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  trustServerCertificate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1000) connectionTimeout?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1000) requestTimeout?: number;
}

export class JsonAgentCredentialsDto {
  @ApiProperty() @IsString() agentUrl!: string;
  @ApiProperty() @IsString() agentToken!: string;
}

export class CreateDataSourceDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: DataSourceTypeDto }) @IsEnum(DataSourceTypeDto) type!: DataSourceTypeDto;

  @ApiProperty({ type: MssqlCredentialsDto })
  @ValidateIf((o: CreateDataSourceDto) => o.type === DataSourceTypeDto.UNIPRO_MSSQL)
  @ValidateNested()
  @Type(() => MssqlCredentialsDto)
  mssql?: MssqlCredentialsDto;

  @ApiProperty({ type: JsonAgentCredentialsDto })
  @ValidateIf((o: CreateDataSourceDto) => o.type === DataSourceTypeDto.UNIPRO_JSON_AGENT)
  @ValidateNested()
  @Type(() => JsonAgentCredentialsDto)
  jsonAgent?: JsonAgentCredentialsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateDataSourceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional({ type: MssqlCredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MssqlCredentialsDto)
  mssql?: MssqlCredentialsDto;

  @ApiPropertyOptional({ type: JsonAgentCredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JsonAgentCredentialsDto)
  jsonAgent?: JsonAgentCredentialsDto;

  @ApiPropertyOptional() @IsOptional() @IsObject() settings?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'DISABLED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'DISABLED'])
  status?: 'DRAFT' | 'ACTIVE' | 'DISABLED';
}

export class TestConnectionDto {
  @ApiProperty({ enum: DataSourceTypeDto }) @IsEnum(DataSourceTypeDto) type!: DataSourceTypeDto;

  @ApiProperty({ type: MssqlCredentialsDto })
  @ValidateIf((o: TestConnectionDto) => o.type === DataSourceTypeDto.UNIPRO_MSSQL)
  @ValidateNested()
  @Type(() => MssqlCredentialsDto)
  mssql?: MssqlCredentialsDto;

  @ApiProperty({ type: JsonAgentCredentialsDto })
  @ValidateIf((o: TestConnectionDto) => o.type === DataSourceTypeDto.UNIPRO_JSON_AGENT)
  @ValidateNested()
  @Type(() => JsonAgentCredentialsDto)
  jsonAgent?: JsonAgentCredentialsDto;
}
