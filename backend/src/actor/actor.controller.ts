import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CreateActorDto } from './dto/actor.dto';
import { ActorService } from './actor.service';
import { Actor } from '@prisma/client';
import { UserId } from '../common/decorators/user-id.decorator';

@ApiTags('Actors')
@Controller('applications/:applicationId/actors')
export class ActorController {
  constructor(private readonly actorService: ActorService) {}

  @Post()
  @ApiBody({ type: CreateActorDto })
  @ApiOperation({
    summary: 'Créer un nouvel acteur',
    description: `
Ce endpoint permet de créer un acteur complet.

Informations requises : 
- **email** : Email de l'acteur
- **firstname** : Prénom de l'acteur
- **lastname** : Nom de l'acteur
- **actorTypeId** : ID du type d'acteur lié à l'acteur 
- **organizationId** : ID de l'organisation liée à l'acteur
- **applicationId** : ID de l'application liée à l'acteur
    `,
  })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiResponse({ status: 201, description: 'Acteur créé avec succès' })
  public async create(
    @Body() createActorDto: CreateActorDto,
    @UserId() userId: string,
  ) {
    Logger.log({
      message: "Début de la création de l'acteur",
      userId: userId,
      action: 'create',
    });

    return await this.actorService.create(createActorDto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un acteur par ID' })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: "ID de l'acteur" })
  public async findOne(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ): Promise<Actor> {
    return await this.actorService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les acteurs' })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiResponse({ status: 200, description: 'Liste des acteurs' })
  public async findAll(
    @Param('applicationId') applicationId: string,
  ): Promise<Actor[]> {
    return await this.actorService.findAll(applicationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un acteur' })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: "ID de l'acteur" })
  public async updated(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() actorToUpdate: CreateActorDto,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la modification de l'acteur",
      actorToUpdate: actorToUpdate,
      action: 'patch',
    });

    return this.actorService.update({
      where: { id: id },
      data: actorToUpdate,
      ownerId: userId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un acteur' })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: "ID de l'acteur" })
  public async delete(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la suppression de l'acteur",
      actorId: id,
      action: 'delete',
    });

    return this.actorService.delete(id, userId);
  }
}
