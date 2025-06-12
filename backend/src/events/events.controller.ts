import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { FiltersDto } from './dto/filters.dto';
import { EventType } from '@prisma/client';
import { UserId } from '../common/decorators/user-id.decorator';
import { EventTypeLabels } from 'src/product/constants/enum-label';
import { translateEnum } from 'src/common/utils/enum.utils';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@ApiTags('Events')
@Controller('applications/:applicationId/events')
export class EventsController {
  constructor(
    private service: EventsService,
    private readonly metadataService: MetadatasService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un nouvel événement',
    description: `Types d'événement : ${Object.values(EventType).join(', ')}`,
  })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({ status: 201, type: Event })
  async create(
    @UserId() userId: string,
    @Body() createEventDto: CreateEventDto,
    @Param('applicationId') applicationId: string,
  ) {
    return await this.service.create({
      ...createEventDto,
      application: {
        connect: {
          id: applicationId,
        },
      },
      metadatas: {
        create: {
          applicationId: applicationId,
          createdById: userId,
          description: `Ajout de l'événement : ${translateEnum(EventTypeLabels, createEventDto.type)}`,
        },
      },
    });
  }

  @Get()
  @ApiOperation({ summary: "Récupérer tous les événements de l'application" })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiQuery({ type: FiltersDto })
  @ApiResponse({ status: 200 })
  findAll(
    @Param('applicationId') applicationId: string,
    @Query() query: FiltersDto,
  ) {
    return this.service.findAll({ ...query, applicationId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un événement par ID' })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200 })
  findOne(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un événement existant',
    description: `Types d'événement : ${Object.values(EventType).join(', ')}`,
  })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({ status: 200, type: Event })
  async update(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateEventDto: CreateEventDto,
  ) {
    return this.service.update(id, {
      ...updateEventDto,
      metadatas: {
        create: {
          applicationId,
          createdById: userId,
          action: 'update',
          description: `Mise à jour de l'événement : ${translateEnum(EventTypeLabels, updateEventDto.type)}`,
        },
      },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un événement' })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200 })
  delete(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteEvent(id, userId);
  }
}
