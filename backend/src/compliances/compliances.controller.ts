import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CompliancesService } from './compliances.service';
import { CreateComplianceDto } from './dto/create-compliance.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';
import { UserId } from '../common/decorators/user-id.decorator';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@ApiTags('Compliances')
@Controller('applications/:applicationId/compliances')
export class CompliancesController {
  constructor(
    private readonly compliancesService: CompliancesService,
    private readonly metadataService: MetadatasService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new compliance for an application' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  create(
    @UserId() userId: string,
    @Body() createComplianceDto: CreateComplianceDto,
    @Param('applicationId') applicationId: string,
  ) {
    return this.compliancesService.create({
      ...createComplianceDto,
      metadatas: {
        create: {
          applicationId: applicationId,
          createdById: userId,
          description: `Ajout de la conformité : ${createComplianceDto.name}`,
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
  @ApiOperation({ summary: 'Retrieve all compliances for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  findAll(@Param('applicationId') applicationId: string) {
    return this.compliancesService.findAll({ applicationId });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve a specific compliance for an application',
  })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the compliance' })
  findOne(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.compliancesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a compliance for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the compliance to update' })
  async update(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateComplianceDto: UpdateComplianceDto,
  ) {
    const oldCompliance = await this.compliancesService.findOne(id);

    const updateCompliance = await this.compliancesService.update(id, {
      ...updateComplianceDto,
    });

    await this.metadataService.createMetadata({
      applicationId,
      createdById: userId,
      entityLabel: `de la conformité ${updateCompliance.name ?? ''}`,
      fields: [
        'type',
        'name',
        'status',
        'validityStart',
        'validityEnd',
        'scoreValue',
        'scoreUnit',
        'notes',
      ],
      fieldLabels: {
        email: 'email',
        type: 'type',
        name: 'nom',
        status: 'statut',
        validityStart: 'date de valididté',
        validityEnd: 'date de fin de validité',
        scoreValue: 'score',
        scoreUnit: 'unité',
        notes: 'notes',
      },
      oldData: oldCompliance,
      newData: updateCompliance,
    });

    return updateCompliance;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a compliance for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the compliance to delete' })
  delete(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.compliancesService.deleteCompliance(id, userId);
  }
}
