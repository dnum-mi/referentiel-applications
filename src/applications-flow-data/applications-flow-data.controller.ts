import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApplicationsFlowDataService } from './applications-flow-data.service';
import { CreateApplicationsFlowDataDto } from './dto/create-applications-flow-data.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Applications')
@Controller('flowdata')
export class ApplicationsFlowDataController {
  constructor(
    private readonly applicationsFlowDataService: ApplicationsFlowDataService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Créer un nouveau flux de données d'application",
    description:
      'Crée un nouveau flux de données pour une application avec les informations fournies.',
  })
  @ApiResponse({
    status: 201,
    description: 'Flux de données créé avec succès.',
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async create(
    @CurrentUser() user: User,
    @Body() createInstanceDto: CreateApplicationsFlowDataDto,
  ) {
    //TODO:
    return await this.applicationsFlowDataService.create({
      ...createInstanceDto,
      ...{ createdby: user.username, updatedby: user.username },
    } as any);
  }

  @Get()
  @ApiOperation({
    summary: "Obtenir tous les flux de données d'applications",
    description:
      "Récupère une liste de tous les flux de données d'applications.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Liste des flux de données d'applications récupérée avec succès.",
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findAll() {
    return await this.applicationsFlowDataService.getAll();
  }

  // @Get(':id')
  
  // async findOne(@Param() params: UUIDParam) {
  //   return await this.applicationsFlowDataService.getOneBy({
  //     dataid: params.id,
  //   });
  // }

  // @Put(':id')
  // async update(
  //   @Param() params: UUIDParam,
  //   @Body() updateInstanceDto: UpdateApplicationsFlowDataDto,
  // ) {
  //   return await this.applicationsFlowDataService.updateOneBy(
  //     { dataid: params.id },
  //     updateInstanceDto,
  //   );
  // }

  @Get('application/:id')
  @ApiOperation({
    summary: 'Obtenir les flux de données associés à une application',
    description:
      'Récupère une liste de tous les flux de données associés à une application spécifique.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des flux de données associés récupérée avec succès.',
  })
  @ApiResponse({
    status: 404,
    description:
      "Aucun flux de données trouvé pour l'ID d'application spécifié.",
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getAssocDataflowsByAppId(@Param() params: UUIDParam) {
    return await this.applicationsFlowDataService.getAll({
      where: {
        appFlow: {
          OR: [
            { applicationsourceid: params.id },
            {
              applicationtargetid: params.id,
            },
          ],
        },
      },
    });
  }
}
