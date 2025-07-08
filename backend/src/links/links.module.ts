import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationLinksController } from './links.controller';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { ApplicationModule } from 'src/product/application.module';

@Module({
  imports: [ApplicationModule],
  controllers: [ApplicationLinksController],
  providers: [LinksService, PrismaService, MetadatasService],
})
export class LinksModule {}
