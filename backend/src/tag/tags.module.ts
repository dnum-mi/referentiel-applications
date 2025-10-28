import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TagRepository } from "./infrastructure/repository/tag.repository";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [
    TagsService,
    {
      provide: "ITagRepository",
      useClass: TagRepository,
    },
  ],
  exports: [
    TagsService,
    "ITagRepository",
  ],
})
export class TagsModule {}
