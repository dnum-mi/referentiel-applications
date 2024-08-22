import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationRolesService } from './application-roles.service';
import { CreateApplicationRoleDto } from './dto/create-application-role.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FilterApplicationRolesDto } from './dto/filter-application-role.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';
import { Resource } from '../auth/policies-guard.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Resource('Role')
@Controller('application-roles')
@ApiTags('Application-Roles')
export class ApplicationRolesController {
  constructor(
    private readonly env: EnvironmentVariablesService,

    private readonly applicationRolesService: ApplicationRolesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('application/:id')
  @ApiOperation({
    summary: "Obtenir les rôles d'application par ID",
    description:
      'Récupère une liste de tous les rôles associés à une application spécifique, identifiée par son ID, avec des filtres optionnels.',
  })
  @ApiResponse({
    status: 200,
    description: "Liste des rôles d'application récupérée avec succès.",
  })
  @ApiResponse({
    status: 404,
    description: "Aucun rôle d'application trouvé pour l'ID spécifié.",
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getApplicationRolesByAppId(
    @Param() params: UUIDParam,
    @Query() filters: FilterApplicationRolesDto,
  ) {
    return this.applicationRolesService.getAllBy({
      applicationId: params.id,
      ...filters,
    });
  }

  @Post(':id/application-roles')
  @ApiOperation({
    summary: "Mettre à jour ou créer un rôle d'application",
    description:
      'Met à jour un rôle existant ou en crée un nouveau pour une application spécifique, identifiée par son ID.',
  })
  @ApiResponse({
    status: 200,
    description: "Rôle d'application mis à jour ou créé avec succès.",
  })
  @ApiResponse({
    status: 404,
    description: "Aucun rôle d'application trouvé pour l'ID spécifié.",
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async updateOrCreateApplicationRoleByAppId(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() createApplicationRoleDto: CreateApplicationRoleDto,
  ) {
    const role =
      await this.applicationRolesService.updateOrCreateApplicationRoleByAppId(
        user.username,
        params.id,
        createApplicationRoleDto,
      );

    if (typeof role === 'string') {
      throw new NotFoundException(role);
    }

    return role;
  }
}
