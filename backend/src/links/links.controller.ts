import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UserId } from '../common/decorators/user-id.decorator';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ApplicationService } from 'src/product/application.service';
import { ApplicationGuard } from 'src/common/guards/application.guard';
import { AppAction } from 'src/common/decorators/application.decorator';

@ApiTags('Links')
@UseGuards(ApplicationGuard)
@Controller('applications/:applicationId/links')
export class ApplicationLinksController {
  constructor(
    private service: LinksService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Post()
  @AppAction('writeLinks')
  @ApiOperation({ summary: 'Create a new link for an application' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  async create(
    @UserId() userId: string,
    @Body() createLinkDto: CreateLinkDto,
    @Param('applicationId') applicationId: string,
  ) {
    const createdLink = await this.service.create({
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
    await this.applicationService.updateApplicationQuality(applicationId);
    return createdLink;
  }

  @Get()
  @AppAction('readLinks')
  @ApiOperation({ summary: 'Retrieve all links for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  findAll(@Param('applicationId') applicationId: string) {
    return this.service.findAll({ applicationId });
  }

  @Patch(':id')
  @AppAction('writeLinks')
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
      triggerQualityUpdate: true,
    });
  }

  @Delete(':id')
  @AppAction('writeLinks')
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
      triggerQualityUpdate: true,
    });
  }
}
