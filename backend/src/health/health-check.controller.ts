import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ConfigType } from "@nestjs/config";
import { appConfig } from "src/config/configs";
import { MaintenanceService } from "src/maintenance/maintenance.service";
import { PrismaService } from "../prisma/prisma.service";
import { HealthCheckDto, HealthCheckErrorDto } from "./dto/health-check.dto";

@ApiTags("Health Check")
@Controller("health-check")
export class HealthCheckController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly maintenanceService: MaintenanceService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Vérification de la santé de l'application",
    description:
      "Exécute une requête basique vers la base de données pour vérifier la connectivité et l'état global de l'application.",
  })
  @ApiOkResponse({
    description: "L'application fonctionne correctement.",
    type: HealthCheckDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      "Le service n'est pas disponible en raison d'une erreur lors de la connexion à la base de données.",
    type: HealthCheckErrorDto,
  })
  async checkHealth(): Promise<HealthCheckDto> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        maintenance: await this.maintenanceService.isActive(),
        version: this.config.version,
        etat: "OK",
      };
    } catch (error) {
      throw new HttpException(
        {
          maintenance: this.maintenanceService.isForced(),
          version: this.config.version,
          etat: "KO",
          message:
            error instanceof Error
              ? error.message
              : "La base de données est indisponible",
        } satisfies HealthCheckErrorDto,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
