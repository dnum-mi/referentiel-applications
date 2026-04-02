import { forwardRef, Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/applications/application.module";
import { MetadatasModule } from "../metadatas/metadatas.module";
import { StatusesController } from "./statuses.controller";
import { StatusesService } from "./statuses.service";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ApplicationModule),
    MetadatasModule,
    CommonModule,
  ],
  controllers: [StatusesController],
  providers: [StatusesService],
  exports: [StatusesService],
})
export class StatusesModule {}
