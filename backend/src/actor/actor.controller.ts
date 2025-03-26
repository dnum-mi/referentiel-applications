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

@ApiTags('actor')
@Controller('actor')
export class ActorController {
  constructor(private readonly actorService: ActorService) {}

  @Post()
  @ApiBody({ type: CreateActorDto })
  @ApiOperation({
    summary: 'Créer un nouvel acteur',
    description: `
Ce endpoint permet de créer un acteur complet.

Informations requises : 
- **role** : Rôle de l'acteur
- **email** : Email de l'acteur
- **firstname** : Prénom de l'acteur
- **lastname** : Nom de l'acteur
- **actorType** : Type d'acteur 
- **organizationId** : ID de l'organisation liée à l'acteur
- **applicationId** : ID de l'application liée à l'acteur
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

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un acteur par ID' })
  public async findOne(@Param('id') id: string): Promise<Actor> {
    return await this.actorService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les acteurs' })
  @ApiResponse({ status: 200, description: 'Liste des acteurs' })
  public async findAll(): Promise<Actor[]> {
    return await this.actorService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un acteur' })
  public async updated(
    @Param('id') id: string,
    @Body() actorToUpdate: UpdateActorDto,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la modification de l'acteur",
      actorToUpdate: actorToUpdate,
      action: 'patch',
    });

    return this.actorService.update({
      where: { id: id },
      data: actorToUpdate,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un acteur' })
  public async delete(@Param('id') id: string): Promise<Actor> {
    Logger.log({
      message: "Début de la suppression de l'acteur",
      actorId: id,
      action: 'delete',
    });

    return this.actorService.delete(id);
  }
}
