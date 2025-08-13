// src/prisma/prisma.module.ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { LoggerModule } from "src/logger/logger.module";

@Global()
@Module({
  imports: [LoggerModule],
  providers: [PrismaService],
  exports: [PrismaService], // export de PrismaService pour les autres modules
})
export class PrismaModule {}
