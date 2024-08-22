import { Controller, Get, Post, Body, Put, Param } from '@nestjs/common';
import { ApplicationsFlowService } from './applications-flow.service';
import { CreateApplicationsFlowDto } from './dto/create-applications-flow.dto';
import { UpdateApplicationsFlowDto } from './dto/update-applications-flow.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Applications')
@Controller('flow')
export class ApplicationsFlowController {
  constructor(
    private readonly applicationsFlowService: ApplicationsFlowService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Créer un nouveau flux d'application",
    description:
      "Crée un nouveau flux d'application avec les informations fournies.",
  })
  @ApiResponse({
    status: 201,
    description: "Flux d'application créé avec succès.",
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async create(
    @CurrentUser() user: User,
    @Body() createInstanceDto: CreateApplicationsFlowDto,
  ) {
    //TODO:
    return await this.applicationsFlowService.create({
      ...createInstanceDto,
      ...{ createdby: user.username, updatedby: user.username },
    } as any);
  }

  @Get()
  @ApiOperation({
    summary: "Obtenir tous les flux d'applications",
    description: "Récupère une liste de tous les flux d'applications.",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des flux d'applications récupérée avec succès.",
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findAll() {
    return await this.applicationsFlowService.getAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: "Obtenir un flux d'application par ID",
    description:
      "Récupère les détails d'un flux d'application spécifique en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: "Flux d'application trouvé avec succès.",
  })
  @ApiResponse({ status: 404, description: "Flux d'application non trouvé." })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findOne(@Param() params: UUIDParam) {
    return await this.applicationsFlowService.getOneBy({ flowid: params.id });
  }

  @Put(':id')
  @ApiOperation({
    summary: "Mettre à jour un flux d'application",
    description:
      "Met à jour les détails d'un flux d'application existant en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: "Flux d'application mis à jour avec succès.",
  })
  @ApiResponse({ status: 404, description: "Flux d'application non trouvé." })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateInstanceDto: UpdateApplicationsFlowDto,
  ) {
    return await this.applicationsFlowService.updateOneBy(
      { flowid: params.id },
      {
        ...updateInstanceDto,
        ...{ updatedby: user.username },
      },
    );
  }

  @Get('application/:id')
  @ApiOperation({
    summary: "Obtenir les flux d'applications par ID d'application",
    description:
      "Récupère une liste de tous les flux d'applications liés à une application spécifique.",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des flux d'applications récupérée avec succès.",
  })
  @ApiResponse({
    status: 404,
    description: "Aucun flux d'application trouvé pour l'ID spécifié.",
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getDataflowsByAppId(@Param() params: UUIDParam) {
    return await this.applicationsFlowService.getAll({
      where: {
        OR: [
          { applicationsourceid: params.id },
          {
            applicationtargetid: params.id,
          },
        ],
      },
    });
  }
}
