import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { CommonModule } from "src/common/common.module";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaQueryBuilder],
})
export class OrganizationsModule {}
