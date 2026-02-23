import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { LabelSourceController } from "./label-source.controller";
import { LabelSourceService } from "./label-source.service";

@Module({
  imports: [PrismaModule],
  controllers: [LabelSourceController],
  providers: [LabelSourceService],
  exports: [LabelSourceService],
})
export class LabelSourceModule {}
