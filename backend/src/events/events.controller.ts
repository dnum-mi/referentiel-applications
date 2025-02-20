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
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { FiltersDto } from './dto/filters.dto';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private service: EventsService) {}

  @Post()
  @ApiResponse({ status: 201, type: Event })
  create(@Body() createEventDto: CreateEventDto) {
    return this.service.create(createEventDto);
  }

  @Get()
  @ApiResponse({ status: 200 })
  findAll(@Query() query: FiltersDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, type: Event })
  update(@Param('id') id: string, @Body() updateEventDto: CreateEventDto) {
    return this.service.update(id, updateEventDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200 })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
