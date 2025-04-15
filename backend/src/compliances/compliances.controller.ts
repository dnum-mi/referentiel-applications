import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CompliancesService } from './compliances.service';
import { CreateComplianceDto } from './dto/create-compliance.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';

@ApiTags('Compliances')
@Controller('applications/:applicationId/compliances')
export class CompliancesController {
  constructor(private readonly compliancesService: CompliancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new compliance for an application' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  create(
    @Req() request,
    @Body() createComplianceDto: CreateComplianceDto,
    @Param('applicationId') applicationId: string,
  ) {
    return this.compliancesService.create({
      ...createComplianceDto,
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
  update(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() updateComplianceDto: UpdateComplianceDto,
  ) {
    return this.compliancesService.update(id, updateComplianceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a compliance for an application' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'applicationId', description: 'ID of the application' })
  @ApiParam({ name: 'id', description: 'ID of the compliance to delete' })
  delete(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ) {
    return this.compliancesService.delete(id);
  }
}
