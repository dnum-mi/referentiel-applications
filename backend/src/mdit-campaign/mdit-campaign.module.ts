import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MditCampaignController } from "./mdit-campaign.controller";
import { MditCampaignService } from "./mdit-campaign.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [MditCampaignController],
  providers: [MditCampaignService],
  exports: [MditCampaignService],
})
export class MditCampaignModule {}
