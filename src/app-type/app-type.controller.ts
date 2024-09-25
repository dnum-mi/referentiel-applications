import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { AppTypeService } from './app-type.service';
import { CreateAppTypeDto } from './dto/create-app-type.dto';
import { ApiBody } from '@nestjs/swagger';
import { UpdateAppTypeDto } from './dto/update-app-type.dto';

@Controller('app-type')
export class AppTypeController {
  constructor(private readonly appTypeService: AppTypeService) {}

  @Get()
  getAllTypes() {
    return this.appTypeService.getAllTypes();
  }

  @Get(':id')
  getTypeById(@Param('id') id: string) {
    return this.appTypeService.getTypeById(id);
  }

  @Post()
  @ApiBody({ type: CreateAppTypeDto })
  createType(@Body() body: { applicationtypecode: string; label: string }) {
    return this.appTypeService.createType(body);
  }

  @Put(':id')
  @ApiBody({ type: UpdateAppTypeDto })
  updateType(@Param('id') id: string, @Body() body: { label: string }) {
    return this.appTypeService.updateType(id, body);
  }

  @Delete(':id')
  deleteType(@Param('id') id: string) {
    return this.appTypeService.deleteType(id);
  }
}
