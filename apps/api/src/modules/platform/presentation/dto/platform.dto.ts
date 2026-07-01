import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const TENANT_PLANS = ['TRIAL', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
const TENANT_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
const USER_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MARKETER', 'VIEWER'] as const;
const USER_STATUSES = ['ACTIVE', 'INVITED', 'DISABLED'] as const;

export class OwnerDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(72) password!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) fullName!: string;
  @ApiPropertyOptional({ enum: ['OWNER', 'ADMIN'] })
  @IsOptional()
  @IsIn(['OWNER', 'ADMIN'])
  role?: 'OWNER' | 'ADMIN';
}

export class CreateTenantDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @ApiProperty() @IsString() @Matches(/^[a-z0-9][a-z0-9-]{1,40}$/) slug!: string;
  @ApiPropertyOptional({ enum: TENANT_PLANS })
  @IsOptional()
  @IsEnum(TENANT_PLANS)
  plan?: (typeof TENANT_PLANS)[number];
  @ApiPropertyOptional({ enum: TENANT_STATUSES })
  @IsOptional()
  @IsEnum(TENANT_STATUSES)
  status?: (typeof TENANT_STATUSES)[number];
  @ApiPropertyOptional({ type: OwnerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerDto)
  owner?: OwnerDto;
}

export class UpdateTenantDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,40}$/)
  slug?: string;
  @ApiPropertyOptional({ enum: TENANT_PLANS })
  @IsOptional()
  @IsEnum(TENANT_PLANS)
  plan?: (typeof TENANT_PLANS)[number];
  @ApiPropertyOptional({ enum: TENANT_STATUSES })
  @IsOptional()
  @IsEnum(TENANT_STATUSES)
  status?: (typeof TENANT_STATUSES)[number];
}

export class CreatePlatformUserDto {
  @ApiProperty() @IsString() tenantId!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(72) password!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) fullName!: string;
  @ApiProperty({ enum: USER_ROLES }) @IsEnum(USER_ROLES) role!: (typeof USER_ROLES)[number];
  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsEnum(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];
}

export class UpdatePlatformUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(8) @MaxLength(72) password?: string;
  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsEnum(USER_ROLES)
  role?: (typeof USER_ROLES)[number];
  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsEnum(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];
}
