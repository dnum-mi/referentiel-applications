import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ActionLogController } from "./action-log.controller";
import { ActionLogService } from "./action-log.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ActionLogController],
  providers: [ActionLogService],
})
export class ActionLogModule {}
