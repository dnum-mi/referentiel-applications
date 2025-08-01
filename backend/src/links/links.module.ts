import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationLinksController } from './links.controller';
import { ApplicationModule } from 'src/product/application.module';
import { MetadataModule } from 'src/metadata/metadata.module';

@Module({
  imports: [ApplicationModule, MetadataModule],
  controllers: [ApplicationLinksController],
  providers: [LinksService, PrismaService],
})
export class LinksModule { }
