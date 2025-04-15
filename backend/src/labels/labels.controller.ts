import {
  Controller,
  Req,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
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
- **value**: Le libellé de l'application.
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
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer les labels par ID d'application",
    description: `
Ce endpoint permet de récupérer la liste de tous les labels d'une application en fonction de son identifiant unique.

Le paramètre **applicationId** doit être fourni dans l'URL.
    `,
  })
  @ApiResponse({ status: 200, description: 'Liste des labels' })
  async findAllSorted(@Param('applicationId') applicationId: string) {
    return this.service.findAllSorted(applicationId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un label existant',
  })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: 'ID du label' })
  @ApiBody({ type: CreateLabelDto })
  @ApiResponse({ status: 200, type: Label })
  update(
    @Req() request,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateLabelDto: CreateLabelDto,
  ) {
    return this.service.update(id, updateLabelDto, request.user.keycloakId);
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
