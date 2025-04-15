import {
  Controller,
  Req,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';

@ApiTags('Links')
@Controller('applications/:applicationId/links')
export class LinksController {
  constructor(private service: LinksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new link for an application' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  create(
    @Req() request,
    @Body() createLinkDto: CreateLinkDto,
    @Param('applicationId') applicationId: string,
  ) {
    return this.service.create({
      ...createLinkDto,
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
  @ApiOperation({ summary: 'Retrieve all links for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  findAll(@Param('applicationId') applicationId: string) {
    return this.service.findAll({ applicationId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a link for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the link to update' })
  update(
    @Req() request,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateLinkDto: CreateLinkDto,
  ) {
    return this.service.update(id, updateLinkDto, request.user.keycloakId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a link for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the link to delete' })
  delete(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(id);
  }
}
