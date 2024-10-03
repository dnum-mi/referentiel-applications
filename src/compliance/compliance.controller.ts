import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { CreateComplianceDto } from './dto/create-compliance.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post()
  create(@Body() createComplianceDto: CreateComplianceDto) {
    return this.complianceService.create(createComplianceDto);
  }

  @Get()
  findAll() {
    return this.complianceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complianceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComplianceDto: UpdateComplianceDto) {
    return this.complianceService.update(+id, updateComplianceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.complianceService.remove(+id);
  }
}
