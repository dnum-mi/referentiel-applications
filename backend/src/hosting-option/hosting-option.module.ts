import { Module } from "@nestjs/common";
import { HostingOptionService } from "./hosting-option.service";
import { HostingOptionController } from "./hosting-option.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [PrismaModule],
  controllers: [HostingOptionController],
  providers: [HostingOptionService, PrismaService],
  exports: [HostingOptionService],
})
export class HostingOptionModule {}
