import { Module } from '@nestjs/common';
import { RelationController } from './relation.controller';
import { RelationService } from './relation.service';
import { RelationRepository } from './infrastructure/repository/relation.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { MetadatasModule } from 'src/metadatas/metadatas.module';

@Module({
  imports: [PrismaModule, MetadatasModule],
  controllers: [RelationController],
  providers: [
    RelationService,
    {
      provide: 'IRelationRepository',
      useClass: RelationRepository,
    },
  ],
  exports: ['IRelationRepository'],
})
export class RelationModule {}
