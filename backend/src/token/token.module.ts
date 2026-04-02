import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { TokenController } from "./token.controller";
import { TokenService } from "./token.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
