import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DataSourceResolverService } from './data-source-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [DataSourceResolverService],
  exports: [DataSourceResolverService],
})
export class SharedUniproModule {}
