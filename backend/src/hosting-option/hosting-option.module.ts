import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "src/common/common.module";
import { HostingOptionController } from "./hosting-option.controller";
import { HostingOptionService } from "./hosting-option.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [HostingOptionController],
  providers: [HostingOptionService],
  exports: [HostingOptionService],
})
export class HostingOptionModule {}
