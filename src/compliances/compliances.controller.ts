import { Controller, Get, Param } from '@nestjs/common';
import { CompliancesService } from './compliances.service';

import { Resource } from '../auth/policies-guard.guard';
import { UUIDParam } from 'src/global-dto/uuid-param.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Resource('Compliance')
@Controller('compliances')
// @ApiTags('Application-Compliances')
export class CompliancesController {
  constructor(private readonly compliancesService: CompliancesService) {}

  @Get('/application/:id')
  @ApiOperation({
    summary: "Obtenir la conformité par ID d'application",
    description:
      'Récupère les informations de conformité associées à une application spécifique, identifiée par son ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Informations de conformité récupérées avec succès.',
  })
  @ApiResponse({
    status: 404,
    description:
      "Aucune information de conformité trouvée pour l'ID d'application spécifié.",
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getComplianceByAppId(@Param() params: UUIDParam) {
    return this.compliancesService.getComplianceByAppId(params.id);
  }
}
