import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { OrganizationMaiaReferencesController } from "./organization-maia-references.controller";
import { OrganizationMaiaReferencesService } from "./organization-maia-references.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [OrganizationMaiaReferencesController],
  providers: [OrganizationMaiaReferencesService],
  exports: [OrganizationMaiaReferencesService],
})
export class OrganizationMaiaReferencesModule {}
