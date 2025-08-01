import { Module } from "@nestjs/common";
import { RelationController } from "./relation.controller";
import { RelationService } from "./relation.service";
import { RelationRepository } from "./infrastructure/repository/relation.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { MetadataModule } from "src/metadata/metadata.module";

@Module({
  imports: [PrismaModule, MetadataModule],
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
export class RelationModule { }
