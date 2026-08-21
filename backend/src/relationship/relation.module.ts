import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CorrelationDetectionService } from "./correlation/correlation-detection.service";
import { RelationRepository } from "./infrastructure/repository/relation.repository";
import { RelationController } from "./relation.controller";
import { RelationService } from "./relation.service";

@Module({
  imports: [PrismaModule, MetadatasModule, CommonModule],
  controllers: [RelationController],
  providers: [
    RelationService,
    CorrelationDetectionService,
    {
      provide: "IRelationRepository",
      useClass: RelationRepository,
    },
  ],
  exports: ["IRelationRepository", CorrelationDetectionService],
})
export class RelationModule {}
