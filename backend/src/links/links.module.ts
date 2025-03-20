import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LinksController } from './links.controller';

@Module({
  controllers: [LinksController],
  providers: [LinksService, PrismaService],
})
export class LinksModule {}
