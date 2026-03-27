import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";

import { BusinessDivisionService } from "./business-division.service";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { BusinessDivisionController } from "./business-division.controller";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [BusinessDivisionController],
  providers: [BusinessDivisionService, PrismaQueryBuilder],
  exports: [BusinessDivisionService],
})
export class BusinessDivisionModule {}
