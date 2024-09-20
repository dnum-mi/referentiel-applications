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
import { ActActor } from '@prisma/client';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Resource } from '../auth/policies-guard.guard';

@Resource('Actor')
@Controller('acteurs')
export class ActeursController {
  constructor(private acteursService: ActeursService) {}

  @Get('application/:appId/actor/:id')
  async getActeur(
    @Param('appId') appId: string,
    @Param('id') id: string,
  ): Promise<ActActor | null> {
    const acteur = await this.acteursService.getOneById(id);

    if (!acteur)
      throw new NotFoundException(`Resource with id ${id} not found`);

    return acteur;
  }

  @Put('application/:appId/actor/:id')
  async updateActeur(
    @CurrentUser() user: User,
    @Param('appId') appId: string,
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
