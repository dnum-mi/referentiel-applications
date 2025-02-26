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
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { FiltersDto } from './dto/filters.dto';

@ApiTags('Events')
@Controller('applications/:applicationId/events')
export class EventsController {
  constructor(private service: EventsService) {}

  @Post()
  @ApiResponse({ status: 201, type: Event })
  create(
    @Req() request,
    @Body() createEventDto: CreateEventDto,
    @Param('applicationId') applicationId: string,
  ) {
    return this.service.create({
      ...createEventDto,
      applicationId,
      createdBy: request.user.keycloakId,
    });
  }

  @Get()
  @ApiResponse({ status: 200 })
  findAll(
    @Param('applicationId') applicationId: string,
    @Query() query: FiltersDto,
  ) {
    return this.service.findAll({ ...query, applicationId });
  }

  @Get(':id')
  @ApiResponse({ status: 200 })
  findOne(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, type: Event })
  update(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateEventDto: CreateEventDto,
  ) {
    return this.service.update(id, updateEventDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200 })
  delete(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(id);
  }
}
