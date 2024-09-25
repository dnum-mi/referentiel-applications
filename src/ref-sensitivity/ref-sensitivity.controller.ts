import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { RefSensitivityService } from './ref-sensitivity.service';
import { CreateRefSensitivityDto } from './dto/create-ref-sensitivity.dto';
import { ApiBody } from '@nestjs/swagger';
import { UpdateRefSensitivityDto } from './dto/update-ref-sensitivity.dto';

@Controller('ref-sensitivity')
export class RefSensitivityController {
  constructor(private readonly refSensitivityService: RefSensitivityService) {}

  @Get()
  getAllSensitivities() {
    return this.refSensitivityService.getAllSensitivities();
  }

  @Get(':id')
  getSensitivityById(@Param('id') id: string) {
    return this.refSensitivityService.getSensitivityById(id);
  }

  @Post()
  @ApiBody({ type: CreateRefSensitivityDto })
  createSensitivity(@Body() body: { sensitivitycode: string; label: string }) {
    return this.refSensitivityService.createSensitivity(body);
  }

  @Put(':id')
  @ApiBody({ type: UpdateRefSensitivityDto })
  updateSensitivity(@Param('id') id: string, @Body() body: { label: string }) {
    return this.refSensitivityService.updateSensitivity(id, body);
  }

  @Delete(':id')
  deleteSensitivity(@Param('id') id: string) {
    return this.refSensitivityService.deleteSensitivity(id);
  }
}
