import { Module } from "@nestjs/common";
import { HostingOptionService } from "./hosting-option.service";
import { HostingOptionController } from "./hosting-option.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [HostingOptionController],
  providers: [HostingOptionService],
  exports: [HostingOptionService],
})
export class HostingOptionModule {}
