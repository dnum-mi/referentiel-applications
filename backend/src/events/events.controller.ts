import {
  Controller,
  Req,
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

@ApiTags('Events')
@Controller('applications/:applicationId/events')
export class EventsController {
  constructor(private service: EventsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un nouvel événement',
    description: `Types d'événement : ${Object.values(EventType).join(', ')}`,
  })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({ status: 201, type: Event })
  create(
    @Req() request,
    @Body() createEventDto: CreateEventDto,
    @Param('applicationId') applicationId: string,
  ) {
    return this.service.create({
      ...createEventDto,
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
  update(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateEventDto: CreateEventDto,
  ) {
    return this.service.update(id, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un événement' })
  @ApiParam({ name: 'applicationId', description: "ID de l'application" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200 })
  delete(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(id);
  }
}
