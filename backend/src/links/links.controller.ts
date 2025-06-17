import {
  Controller,
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
import { UserId } from '../common/decorators/user-id.decorator';
import { UpdateLinkDto } from './dto/update-link.dto';

@ApiTags('Links')
@Controller('applications/:applicationId/links')
export class LinksController {
  constructor(private service: LinksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new link for an application' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  async create(
    @UserId() userId: string,
    @Body() createLinkDto: CreateLinkDto,
    @Param('applicationId') applicationId: string,
  ) {
    return await this.service.create({
      ...createLinkDto,
      application: {
        connect: {
          id: applicationId,
        },
      },
      metadatas: {
        create: {
          applicationId: applicationId,
          createdById: userId,
          description: `Ajout du lien : ${createLinkDto.link}`,
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
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateLinkDto: UpdateLinkDto,
  ) {
    return this.service.updateWithMetadata({
      id,
      data: updateLinkDto,
      userId,
      applicationId,
      gender: 'du lien',
      entityName: 'externalRessourceId',
      metadataFields: {
        link: 'lien',
        type: 'type',
        description: 'description',
      },
      getName: (entity) => entity.link,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a link for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the link to delete' })
  delete(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteWithMetadata({
      id,
      userId,
      applicationId,
      gender: 'du lien',
      name: 'link',
    });
  }
}
