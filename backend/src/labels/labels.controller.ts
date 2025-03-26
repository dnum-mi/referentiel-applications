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
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { FiltersDto } from './dto/filters.dto';
import { Label } from './entities/label.entity';

@ApiTags('Labels')
@Controller('applications/:applicationId/labels')
export class LabelsController {
  constructor(private service: LabelsService) {}

  @Post()
  @ApiResponse({ status: 201, type: Label })
  async create(
    @Req() request,
    @Body() createLabelDto: CreateLabelDto,
    @Param('applicationId') applicationId: string,
  ) {
    try {
      console.log('Request Data:', createLabelDto);
      console.log('User:', request.user);
      console.log('Application ID:', applicationId);
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
      console.log('Label created:', result);
      return result;
    } catch (error) {
      console.error('Error creating label:', error);
      throw error;
    }
  }

  @Get()
  @ApiResponse({ status: 200 })
  async findAllSorted(@Param('applicationId') applicationId: string) {
    return this.service.findAllSorted(applicationId);
  }

  @Get('current') // Correction pour récupérer uniquement le label principal
  @ApiResponse({ status: 200 })
  async findCurrentLabel(@Param('applicationId') applicationId: string) {
    return this.service.findCurrentLabel(applicationId);
  }

  @Delete(':id')
  @ApiResponse({ status: 200 })
  async delete(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(id);
  }
}
