import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";

import { BusinessDivisionRepository } from "./business-division.repository";
import { BusinessDivisionService } from "./business-division.service";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { BusinessDivisionController } from "./business-division.controller";

@Module({
  imports: [PrismaModule],
  controllers: [BusinessDivisionController],
  providers: [
    BusinessDivisionRepository,
    BusinessDivisionService,
    PrismaQueryBuilder,
  ],
  exports: [BusinessDivisionService],
})
export class BusinessDivisionModule {}
