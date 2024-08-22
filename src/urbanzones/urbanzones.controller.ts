import { Controller, Get, Post, Body, Put, Param } from '@nestjs/common';
import { UrbanzonesService } from './urbanzones.service';
import { CreateUrbanzoneDto } from './dto/create-urbanzone.dto';
import { UpdateUrbanzoneDto } from './dto/update-urbanzone.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Urbanzone')
@Controller('urbanzones')
export class UrbanzonesController {
  constructor(private readonly urbanzonesService: UrbanzonesService) {}

  @Post()
  @ApiOperation({
    summary: "Créer une nouvelle zone d'urbanisme",
    description:
      "Crée une nouvelle zone d'urbanisme avec les informations fournies.",
  })
  @ApiResponse({
    status: 201,
    description: "Zone d'urbanisme créée avec succès.",
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async create(
    @CurrentUser() user: User,
    @Body() createInstanceDto: CreateUrbanzoneDto,
  ) {
    //TODO:
    return await this.urbanzonesService.create({
      ...createInstanceDto,
      ...{ createdby: user.username, updatedby: user.username },
    } as any);
  }

  @Get()
  @ApiOperation({
    summary: "Obtenir toutes les zones d'urbanisme",
    description: "Récupère une liste de toutes les zones d'urbanisme.",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des zones d'urbanisme récupérée avec succès.",
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findAll() {
    return await this.urbanzonesService.getAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: "Obtenir une zone d'urbanisme par ID",
    description:
      "Récupère les détails d'une zone d'urbanisme spécifique en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: "Zone d'urbanisme trouvée avec succès.",
  })
  @ApiResponse({ status: 404, description: "Zone d'urbanisme non trouvée." })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findOne(@Param() params: UUIDParam) {
    return await this.urbanzonesService.getOneBy({ urbanzoneid: params.id });
  }

  @Put(':id')
  @ApiOperation({
    summary: "Mettre à jour une zone d'urbanisme",
    description:
      "Met à jour les détails d'une zone d'urbanisme existante en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: "Zone d'urbanisme mise à jour avec succès.",
  })
  @ApiResponse({ status: 404, description: "Zone d'urbanisme non trouvée." })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateInstanceDto: UpdateUrbanzoneDto,
  ) {
    return await this.urbanzonesService.updateOneBy(
      { urbanzoneid: params.id },
      { ...updateInstanceDto, ...{ updatedby: user.username } },
    );
  }

  @Get('application/:id')
  @ApiOperation({
    summary: "Obtenir les zones d'urbanisme par ID d'application",
    description:
      "Récupère toutes les zones d'urbanisme associées à une application spécifique, identifiée par son ID.",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des zones d'urbanisme associées récupérée avec succès.",
  })
  @ApiResponse({
    status: 404,
    description:
      "Aucune zone d'urbanisme trouvée pour l'ID d'application spécifié.",
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getUrbanZonesByAppId(@Param() params: UUIDParam) {
    return this.urbanzonesService.getAll({
      where: {
        fctUrbanzoneapplication: {
          some: {
            applicationid: params.id,
          },
        },
      },
    });
  }
}
