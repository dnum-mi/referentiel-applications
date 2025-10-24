import { forwardRef, Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationModule } from "src/product/application.module";
import { StatusesController } from "./statuses.controller";
import { StatusesService } from "./statuses.service";

@Module({
  imports: [PrismaModule, forwardRef(() => ApplicationModule)],
  controllers: [StatusesController],
  providers: [StatusesService],
  exports: [StatusesService],
})
export class StatusesModule {}
