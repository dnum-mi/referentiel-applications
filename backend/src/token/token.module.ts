import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TokenRepository } from "./repository/token.repository";
import { TokenController } from "./token.controller";
import { TokenService } from "./token.service";

@Module({
  imports: [PrismaModule],
  controllers: [TokenController],
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
