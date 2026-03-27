import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RelationRepository } from "./infrastructure/repository/relation.repository";
import { RelationController } from "./relation.controller";
import { RelationService } from "./relation.service";

@Module({
  imports: [PrismaModule, MetadatasModule, CommonModule],
  controllers: [RelationController],
  providers: [
    RelationService,
    {
      provide: "IRelationRepository",
      useClass: RelationRepository,
    },
  ],
  exports: ["IRelationRepository"],
})
export class RelationModule {}
