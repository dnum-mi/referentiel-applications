import { Module } from "@nestjs/common";
import { TokenService } from "./token.service";
import { TokenController } from "./token.controller";
import { TokenRepository } from "./repository/token.repository";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [
    TokenController,
  ],
  providers: [
    TokenService,
    {
      provide: "ITokenRepository",
      useClass: TokenRepository,
    },
  ],
  exports: ["ITokenRepository", TokenService],
})
export class TokenModule {}
