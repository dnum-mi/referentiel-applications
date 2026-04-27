import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { RgaaController } from "./rgaa.controller";
import { RgaaService } from "./rgaa.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [RgaaController],
  providers: [RgaaService],
  exports: [RgaaService],
})
export class RgaaModule {}
