import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { ActeursService } from './acteurs.service';
import { UpdateActeurDto } from './dto/update-acteur.dto';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActActor } from '@prisma/client';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Resource } from '../auth/policies-guard.guard';

@Resource('Actor')
@Controller('acteurs')
@ApiTags('Acteurs')
@ApiExtraModels(UpdateActeurDto)
export class ActeursController {
  constructor(private acteursService: ActeursService) {}

  @Get('application/:id/actor/:actorId')
  @ApiOperation({
    summary:
      "Récupére les détails d'un acteur spécifique associé à une application",
  })
  @ApiResponse({
    status: 200,
    description:
      "Détails de l'acteur spécifique associé à l' application récupérés avec succès.",
  })
  @ApiResponse({ status: 404, description: 'Acteur non trouvé.' }) // Réponse 404
  async getActeur(
    @Param('actorId') actorId: string,
    @Param('id') id: string,
  ): Promise<ActActor | null> {
    const acteur = await this.acteursService.getOneById(id);

    if (!acteur)
      throw new NotFoundException(`Resource with id ${id} not found`);

    return acteur;
  }

  @Put('application/:id/actor/:actorId')
  @ApiOperation({
    summary: 'Mettre à jour un acteur',
    description:
      "Met à jour les détails d'un acteur spécifique en utilisant l'ID de l'application et l'ID de l'acteur.",
  })
  @ApiResponse({
    status: 200,
    description: 'Acteur mis à jour avec succès.',
  })
  @ApiResponse({
    status: 404,
    description: 'Acteur ou application non trouvé.',
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async updateActeur(
    @CurrentUser() user: User,
    @Param('actorId') actorId: string,
    @Param('id') id: string,
    @Body() updateActeurDto: UpdateActeurDto,
  ): Promise<ActActor | null> {
    const acteur = await this.acteursService.updateOneById(
      user.username,
      id,
      updateActeurDto,
    );

    if (!acteur)
      throw new NotFoundException(`Resource with id ${id} not found`);

    return acteur;
  }
}
