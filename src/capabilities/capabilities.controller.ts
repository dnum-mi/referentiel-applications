import { Controller, Get, Post, Body, Put, Param, Query } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { CreateCapabilityDto } from './dto/create-capability.dto';
import { UpdateCapabilityDto } from './dto/update-capability.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FilterCapabilitysDto } from './dto/filter-capability.dto';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from '../current-user/current-user.decorator';

@ApiTags('Capabilities')
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly capabilitiesService: CapabilitiesService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une nouvelle capacité',
    description:
      'Une capacité représente une fonction métier nécessaire à la réalisation des enjeux métiers. Cette route permet de créer une nouvelle capacité.',
  })
  @ApiResponse({
    status: 201,
    description: 'Capacité créée avec succès.',
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async create(
    @CurrentUser() user: User,
    @Body() createCapabilityDto: CreateCapabilityDto,
  ) {
    return await this.capabilitiesService.create(
      user.username,
      createCapabilityDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Obtenir toutes les capacités',
    description:
      'Récupère une liste de toutes les capacités existantes, filtrées par les critères fournis.',
  })
  @ApiResponse({
    status: 201,
    description: 'Capacité créée avec succès.',
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getAll(@Query() filters: FilterCapabilitysDto) {
    return await this.capabilitiesService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtenir toutes les capacités',
    description:
      'Récupère une liste de toutes les capacités avec des filtres optionnels.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des capacités récupérée avec succès.',
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findOne(@Param() params: UUIDParam) {
    return await this.capabilitiesService.getOneById(params.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Mettre à jour une capacité',
    description:
      "Met à jour les détails d'une capacité existante en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: 'Capacité mise à jour avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Capacité non trouvée.' })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateCapabilityDto: UpdateCapabilityDto,
  ) {
    return await this.capabilitiesService.updateOneById(
      user.username,
      params.id,
      updateCapabilityDto,
    );
  }

  @Get('/application/:id')
  @ApiOperation({
    summary: "Obtenir les capacités par ID d'application",
    description:
      'Récupère une liste de toutes les capacités liées à une application spécifique.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des capacités récupérée avec succès.',
  })
  @ApiResponse({
    status: 404,
    description: "Aucune capacité trouvée pour l'ID d'application spécifié.",
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getCapacitesByAppId(
    @Param() params: UUIDParam,
    @Query() filters: FilterCapabilitysDto,
  ) {
    return await this.capabilitiesService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
      applicationId: params.id,
    });
  }
}
