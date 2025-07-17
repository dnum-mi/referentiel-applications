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
import { ApplicationService } from 'src/product/application.service';

@ApiTags('Compliances')
@Controller('compliances')
export class ComplianceController {
  constructor(private readonly complianceService: CompliancesService) {}

  @Get('count')
  @ApiOperation({
    summary: 'Récupérer le nombre total de conformités (toutes applications)',
  })
  public async countAllCompliances(): Promise<number> {
    return this.complianceService.countAll();
  }
}

@ApiTags('Compliances')
@Controller('applications/:applicationId/compliances')
export class ApplicationCompliancesController {
  constructor(
    private readonly compliancesService: CompliancesService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new compliance for an application' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  async create(
    @UserId() userId: string,
    @Body() createComplianceDto: CreateComplianceDto,
    @Param('applicationId') applicationId: string,
  ) {
    const createdCompliance = await this.compliancesService.create({
      ...createComplianceDto,
      application: {
        connect: {
          id: applicationId,
        },
      },
      metadatas: {
        create: {
          applicationId: applicationId,
          createdById: userId,
          description: `Ajout de la conformité : ${createComplianceDto.name}`,
        },
      },
    });
    await this.applicationService.updateApplicationQuality(applicationId);
    return createdCompliance;
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
  findOne(@Param('id') id: string) {
    return this.compliancesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a compliance for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the compliance to update' })
  update(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateComplianceDto: UpdateComplianceDto,
  ) {
    return this.compliancesService.updateWithMetadata({
      id,
      data: updateComplianceDto,
      userId,
      applicationId,
      gender: 'de la conformité',
      entityName: 'complianceId',
      metadataFields: {
        email: 'email',
        type: 'type',
        name: 'nom',
        status: 'statut',
        validityStart: 'date de validité',
        validityEnd: 'date de fin de validité',
        scoreValue: 'score',
        scoreUnit: 'unité',
        notes: 'notes',
      },
      getName: (entity) => entity.name,
      triggerQualityUpdate: true,
    });
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
    return this.compliancesService.deleteWithMetadata({
      id,
      userId,
      applicationId,
      gender: 'de la conformité',
      name: 'name',
      triggerQualityUpdate: true,
    });
  }
}
