import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum SyncEntityDto {
  ENTITIES = 'ENTITIES',
  STORES = 'STORES',
  USERS = 'USERS',
  PARTNER_GROUPS = 'PARTNER_GROUPS',
  PARTNERS = 'PARTNERS',
  GOODS_GROUPS = 'GOODS_GROUPS',
  GOODS = 'GOODS',
  DOCUMENTS = 'DOCUMENTS',
}

export class RunEntitySyncDto {
  @ApiProperty({ enum: SyncEntityDto })
  @IsEnum(SyncEntityDto)
  entity!: SyncEntityDto;
}
