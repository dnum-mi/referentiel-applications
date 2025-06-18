import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LinksController } from './links.controller';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Module({
  controllers: [LinksController],
  providers: [LinksService, PrismaService, MetadatasService],
})
export class LinksModule {}
