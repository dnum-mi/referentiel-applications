import { MulterModule } from "@nestjs/platform-express";
import { SBOM_LIMITS } from "./sbom-limits";
import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { SbomController } from "./sbom.controller";
import { SbomService } from "./sbom.service";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    MulterModule.registerAsync({
      useFactory: () => {
        // Lit et valide toutes les bornes après le chargement des variables .env.
        const limits = { ...SBOM_LIMITS };
        return {
          limits: {
            fileSize: limits.maxBytes,
            files: 1,
            fields: 3,
            fieldSize: 2048,
          },
        };
      },
    }),
  ],
  controllers: [SbomController],
  providers: [SbomService],
  exports: [SbomService],
})
export class SbomModule {}
