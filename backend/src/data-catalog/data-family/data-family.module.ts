import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { DataFamilyController } from "./data-family.controller";
import { DataFamilyService } from "./data-family.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [DataFamilyController],
  providers: [DataFamilyService],
  exports: [DataFamilyService],
})
export class DataFamilyModule {}
