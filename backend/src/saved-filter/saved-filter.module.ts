import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SavedFilterController } from "./saved-filter.controller";
import { SavedFilterService } from "./saved-filter.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SavedFilterController],
  providers: [SavedFilterService],
})
export class SavedFilterModule {}
