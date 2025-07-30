import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Request,
  Logger,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ActorTypeService } from './actorType.service';
import { CreateActorTypeDto, PatchActorTypeDto } from './dto/actorType.dto';
import { ActorType, AppPermissions } from '@prisma/client';
import { AppPermsDto } from './dto/app-perms-matrix.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { RequiredAdminLevel } from 'src/common/decorators/admin.decorator';
import { AdminLevel } from 'src/user/entities/user.entity';

/**
 * Controller la gestion des types d'acteur
 * Permet de créer, mettre à jour, modifier
 */
@ApiTags('actorTypes')
@UseGuards(AdminGuard)
@Controller('actorTypes')
export class ActorTypeController {
  constructor(private readonly actorTypeService: ActorTypeService) {}

  /**
   * Crée un nouveau type d'acteur
   * Cette méthode permet de créer un type d'acteur en utilisant les données fournies
   *
   * @param CreateActorTypeDto Les données nécessaires pour créer un nouveau type d'acteur
   * @param req La requête contenant le token de l'utilisateur authentifié
   *
   * @returns Le nouveau type d'acteur créé
   * @throws BadRequestException Si le token est invalide ou l'identifiant utilisateur est manquant
   */
  @Post()
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiBody({ type: CreateActorTypeDto })
  @ApiOperation({
    summary: 'Créer un nouveau type d’acteur',
    description: `
**Ce endpoint permet de créer un type d’acteur complète**

Vous devez fournir les informations suivantes :
- **code**: Le code du type d’acteur
- **label**: Le libellé du type d’acteur
- **description**: La description du type d’acteur
    `,
  })
  @ApiResponse({ status: 201, description: 'type d’acteur créé avec succes' })
  public async create(
    @Body() CreateActorTypeDto: CreateActorTypeDto,
    @Request() req,
  ) {
    Logger.log({
      message: "Début de la création du type d'acteur",
      userId: req.user.keycloakId,
      action: 'create',
    });

    return await this.actorTypeService.create(CreateActorTypeDto);
  }

  @Get('/perms-matrix')
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiResponse({
    status: 200,
    description: 'Liste les types d’acteurs par id et de leurs permissions',
  })
  public async getMatrix(): Promise<AppPermissions[]> {
    return this.actorTypeService.getPermsMatrix();
  }

  /**
   * Récupère un type d'acteur spécifique par son ID
   *
   * @param id L'identifiant du type d'acteur à récupérer
   *
   * @returns Le type d'acteur correspondant à l'ID spécifié
   * @throws NotFoundException Si le type d'acteur n'est pas trouvée
   */
  @Get(':id')
  @RequiredAdminLevel(AdminLevel.NONE)
  @ApiOperation({
    summary: 'Récupérer un type d’acteur spécifique par ID',
    description: `Cet endpoint permet de récupérer les détails complets d'un type d’acteur en fonction de son identifiant unique.`,
  })
  public async findOne(@Param('id') id: string): Promise<ActorType> {
    return await this.actorTypeService.findOne(id);
  }

  @Patch('/perms-matrix')
  @ApiResponse({
    status: 200,
    description: 'Met à jour la matrice des permissions',
  })
  public async updateMatrix(
    @Body() appPermsMatrix: AppPermsDto[],
  ): Promise<AppPermissions[]> {
    return this.actorTypeService.updatePermsMatrix(appPermsMatrix);
  }

  @Get()
  @RequiredAdminLevel(AdminLevel.NONE)
  @ApiResponse({ status: 200, description: 'Liste les types d’acteurs' })
  public async findAll(): Promise<ActorType[]> {
    return await this.actorTypeService.findAll();
  }

  /**
   * Met à jour les informations d'un type d’acteur
   *
   * @param id L'identifiant du type d'acteur à mettre à jour
   * @param actorTypeToUpdate Les nouvelles données du type d'acteur à mettre à jour
   *
   * @returns Le type d'acteur mis à jour
   */
  @Patch(':id')
  @RequiredAdminLevel(AdminLevel.WRITE)
  @ApiOperation({
    summary: 'Mettre à jour un type d’acteur',
    description: `
Ce endpoint permet de mettre à jour un type d’acteur existante
Vous devez fournir l'identifiant du type d’acteur dans l'URL et les nouvelles données dans le corps de la requête
Les données de mise à jour doivent correspondre aux champs
    `,
  })
  public async update(
    @Param('id') id: string,
    @Body() actorTypeToUpdate: PatchActorTypeDto,
  ): Promise<PatchActorTypeDto> {
    Logger.log({
      message: 'Début de la modification du type d’acteur ',
      actorTypeToUpdate: actorTypeToUpdate,
      action: 'patch',
    });

    return this.actorTypeService.update(id, actorTypeToUpdate);
  }

  @Delete(':id')
  @RequiredAdminLevel(AdminLevel.WRITE)
  @ApiOperation({ summary: 'Supprimer un type d’acteur' })
  public async delete(@Param('id') id: string) {
    return await this.actorTypeService.delete(id);
  }
}
