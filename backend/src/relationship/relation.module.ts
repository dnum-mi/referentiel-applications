import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CorrelationDetectionService } from "./correlation/correlation-detection.service";
import { CorrelationSuggestionController } from "./correlation/correlation-suggestion.controller";
import { CorrelationSuggestionService } from "./correlation/correlation-suggestion.service";
import { CorrelationSuggestionRepository } from "./correlation/infrastructure/repository/correlation-suggestion.repository";
import { RelationRepository } from "./infrastructure/repository/relation.repository";
import { RelationController } from "./relation.controller";
import { RelationService } from "./relation.service";

@Module({
  imports: [PrismaModule, MetadatasModule, CommonModule],
  controllers: [RelationController, CorrelationSuggestionController],
  providers: [
    RelationService,
    CorrelationDetectionService,
    CorrelationSuggestionService,
    {
      provide: "IRelationRepository",
      useClass: RelationRepository,
    },
    {
      provide: "ICorrelationSuggestionRepository",
      useClass: CorrelationSuggestionRepository,
    },
  ],
  exports: ["IRelationRepository", CorrelationDetectionService],
})
export class RelationModule {}
