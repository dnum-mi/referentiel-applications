import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Request,
  Param,
  Logger,
} from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateActorDto, UpdateActorDto } from './dto/actor.dto';
import { ActorService } from './actor.service';
import { Actor } from '@prisma/client';

/**
 * Contrôler la gestion des acteurs
 * Permet de créer, mettre à jour et modifier
 */
@ApiTags('actor')
@Controller('actor')
export class ActorController {
  constructor(private readonly actorService: ActorService) {}

  /**
   * Créer un nouvel acteur
   * Cette méthode permet de créer un nouvel acteur en utilisant les données fournies
   *
   * @param CreateActorDto Les données nécessaires pour créer un nouvel acteur
   * @param req La requête contenant le token de l'utilisateur authentifié
   *
   * @returns Le nouvel acteur créé
   * @throws BadRequestException Si le token est invalide ou l'identifiant utilisateur est manquant
   */
  @Post()
  @ApiBody({ type: CreateActorDto })
  @ApiOperation({
    summary: 'Créer un nouvel acteur',
    description: `
**Ce endpoint permet de créer un acteur complet**

Vous devez fournir les informations suivantes : 
- **role** : Le rôle de l'acteur
- **email** : Email de l'acteur
- **firstname** : Prénom de l'acteur
- **lastname** : Nom de l'acteur
- **actorType** : Type d'acteur 
- **organizationId** : Id de l'organisation lié à l'acteur
- **applicationId** : Id de l'application lié à l'acteur
    `,
  })
  @ApiResponse({ status: 201, description: 'Acteur créé avec succès' })
  public async create(@Body() CreateActor: CreateActorDto, @Request() req) {
    Logger.log({
      message: "Début de la création de l'acteur",
      userId: req.user.keycloakId,
      action: 'create',
    });

    return await this.actorService.create(CreateActor);
  }

  /**
   * Récupère un acteur spécifique par son ID
   *
   * @param id L'identifiant de l'acteur à récupérer
   *
   * @returns L'acteur correspondant à l'ID spécifié
   * @throws NotFoundException Si l'acteur n'est pas trouvé
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un acteur spécifique par ID',
    description: `
  Ce endpoint permet de récupérer les détails complets d'un acteur en fonction de son identifiant unique.
    `,
  })
  public async findOne(@Param('id') id: string): Promise<Actor> {
    return await this.actorService.findOne(id);
  }

  /**
   * Récupère tous les acteurs
   *
   * @returns La liste de tous les acteurs
   */
  @Get()
  @ApiOperation({
    summary: 'Récupérer les acteurs',
    description: `
Ce endpoint permet de récupérer la liste de tous les acteurs existants dans le système

Aucun paramètre n'est pas requis pour accéder à cette liste
    `,
  })
  @ApiResponse({ status: 200, description: 'Liste des acteurs' })
  public async findAll(): Promise<Actor[]> {
    return await this.actorService.findAll();
  }

  /**
   * Met à jour les informations d'un acteur
   *
   * @param id L'identifiant de l'acteur à mettre à jour
   * @param actorToUpdate Les nouvelles données de l'acteur à mettre à jour
   *
   * @returns L'acteur mis à jour
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un acteur',
    description: `
Ce endpoint permet de mettre à jour un acteur existant
Vous devez fournir l'identifiant de l'acteur dans l'URL et les nouvelles données dans le corps de la requête
Les données de mise à jour doivent correspondre aux champs
    `,
  })
  public async updated(
    @Param('id') id: string,
    @Body() actorToUpdate: UpdateActorDto,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la modification de l'organisation",
      actorToUpdate: actorToUpdate,
      action: 'patch',
    });

    return this.actorService.update({
      where: { id: id },
      data: actorToUpdate,
    });
  }

  /**
   * Supprime un acteur spécifique par son ID
   *
   * @param id L'identifiant de l'acteur à supprimer
   *
   * @returns Un message de confirmation de suppression
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un acteur',
    description: `
Ce endpoint permet de supprimer un acteur existant
Vous devez fournir l'identifiant de l'acteur dans l'URL
    `,
  })
  public async delete(@Param('id') id: string): Promise<Actor> {
    Logger.log({
      message: "Début de la suppression de l'acteur",
      actorId: id,
      action: 'delete',
    });

    return this.actorService.delete(id);
  }
}
