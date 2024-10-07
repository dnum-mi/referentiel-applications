import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { FilterOrganisationsDto } from './dto/filter-organisations.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Organisation } from './entities/organisation.entity';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

@Controller('organisations')
@ApiTags('Organisations')
export class OrganisationsController {
  constructor(private organisationsService: OrganisationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtenir toutes les organisations',
    description:
      "Récupère une liste d'organisations avec des filtres optionnels.",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des organisations récupérée avec succès.',
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getAll(@Query() filters: FilterOrganisationsDto) {
    return await this.organisationsService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
      label: filters.label,
      code: filters.code,
      parentOnly: filters.parent,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtenir une organisation par ID',
    description:
      "Récupère les détails d'une organisation spécifique en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: 'Organisation trouvée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findOne(@Param() params: UUIDParam) {
    const res = await this.organisationsService.getOneById(params.id);

    if (!res)
      throw new NotFoundException(`Resource with id ${params.id} not found`);

    return res;
  }

  @Post()
  @ApiOperation({
    summary: 'Créer une nouvelle organisation',
    description:
      'Crée une nouvelle organisation avec les informations fournies.',
  })
  @ApiResponse({
    status: 201,
    description: 'Organisation créée avec succès.',
  })
  @ApiResponse({ status: 422, description: 'Données non traitables.' })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async createOrganisation(
    @CurrentUser() user: User,
    @Body() createOrganisationDto: CreateOrganisationDto,
  ): Promise<Organisation | null> {
    const Organisation = await this.organisationsService.create(
      user.username,
      createOrganisationDto,
    );

    if (!Organisation) throw new UnprocessableEntityException();

    return Organisation;
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Mettre à jour une organisation',
    description:
      "Met à jour les détails d'une organisation existante en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: 'Organisation mise à jour avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée.' })
  @ApiResponse({ status: 422, description: 'Données non traitables.' })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async updateOrganisation(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateOrganisationDto: UpdateOrganisationDto,
  ): Promise<Organisation | null> {
    const Organisation = await this.organisationsService.updateOneById(
      user.username,
      params.id,
      updateOrganisationDto,
    );

    if (!Organisation)
      throw new NotFoundException(`Resource with id ${params.id} not found`);

    return Organisation;
  }
}
