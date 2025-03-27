import {
  Controller,
  Req,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiBody } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { FiltersDto } from './dto/filters.dto';
import { Label } from './entities/label.entity';

@ApiTags('Labels')
@Controller('applications/:applicationId/labels')
export class LabelsController {
  constructor(private service: LabelsService) {}

  @Post()
  @ApiBody({ type: CreateLabelDto })
  @ApiOperation({
    summary: 'Créer un nouveau label',
    description: `
**Ce endpoint permet de créer un label complet.**

Vous devez fournir les informations suivantes :
- **source**: La source de l'application.
- **label**: Le libellé de l'application.
- **shortname**: Le nom court de l'application (peut être vide).
    `,
  })
  @ApiResponse({
    status: 201,
    type: Label,
    description: 'Label créé avec succès.',
  })
  async create(
    @Req() request,
    @Body() createLabelDto: CreateLabelDto,
    @Param('applicationId') applicationId: string,
  ) {
    try {
      const result = await this.service.create({
        ...createLabelDto,
        metadata: {
          create: {
            createdById: request.user.keycloakId,
            updatedById: request.user.keycloakId,
          },
        },
        application: {
          connect: {
            id: applicationId,
          },
        },
      });
      return result;
    } catch (error) {
      console.error('Error creating label:', error);
      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer les labels par ID d'application",
    description: `
Ce endpoint permet de récupérer la liste de tous les labels d'une application en fonction de son identifiant unique.

Ils seront triés du plus récent au moins récent, priorisant la source refApp.

Le paramètre **applicationId** doit être fourni dans l'URL.
    `,
  })
  @ApiResponse({ status: 200, description: 'Liste des labels' })
  async findAllSorted(@Param('applicationId') applicationId: string) {
    return this.service.findAllSorted(applicationId);
  }

  @Get('current')
  @ApiOperation({
    summary: "Récupérer le label courant d'une application",
    description: `
Ce endpoint permet de récupérer les détails complets du label d'une application en fonction de son identifiant unique.

Le paramètre **applicationId** doit être fourni dans l'URL.
    `,
  })
  @ApiResponse({ status: 200, description: 'Label courant' })
  async findCurrentLabel(@Param('applicationId') applicationId: string) {
    return this.service.findCurrentLabel(applicationId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un label',
    description: ` Ce endpoint permet de supprimer un label existant. 
    Vous devez fournir l'identifiant du label dans l'URL.
    `,
  })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(id);
  }
}
