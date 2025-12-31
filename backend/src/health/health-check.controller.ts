import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Health Check")
@Controller("health-check")
export class HealthCheckController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: "Vérification de la santé de l'application",
    description:
      "Exécute une requête basique vers la base de données pour vérifier la connectivité et l'état global de l'application.",
  })
  @ApiOkResponse({
    description: "L'application fonctionne correctement.",
    schema: {
      example: {
        status: "ok",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description:
      "Le service n'est pas disponible en raison d'une erreur lors de la connexion à la base de données.",
    schema: {
      example: {
        status: "error",
        message: "Détail de l'erreur",
      },
    },
  })
  async checkHealth(): Promise<{ status: string; message?: string }> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch (error) {
      throw new HttpException(
        { status: "error", message: error },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
