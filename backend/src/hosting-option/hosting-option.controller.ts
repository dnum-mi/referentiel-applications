import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { HostingOptionService } from './hosting-option.service';
import {
  CreateHostingOptionDto,
  UpdateHostingOptionDto,
  HostingOptionFiltersDto,
} from './dto/hosting-option.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('HostingOptions')
@Controller('hosting-options')
export class HostingOptionController {
  constructor(private readonly hostingOptionService: HostingOptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hosting option' })
  @ApiResponse({
    status: 201,
    description: 'Hosting option created successfully',
  })
  create(@Body() createHostingOptionDto: CreateHostingOptionDto) {
    return this.hostingOptionService.create(createHostingOptionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all hosting options with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of hosting options' })
  @ApiQuery({ type: HostingOptionFiltersDto, required: false })
  findAll(@Query() filters: HostingOptionFiltersDto) {
    return this.hostingOptionService.findAll(filters);
  }

  @Get('sites')
  @ApiOperation({ summary: 'Get all distinct site values' })
  @ApiResponse({ status: 200, description: 'List of distinct sites' })
  findDistinctSites() {
    return this.hostingOptionService.findDistinctSites();
  }

  @Get('platforms')
  @ApiOperation({ summary: 'Get all distinct platform values' })
  @ApiResponse({ status: 200, description: 'List of distinct platforms' })
  findDistinctPlatforms() {
    return this.hostingOptionService.findDistinctPlatforms();
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get all distinct provider values' })
  @ApiResponse({ status: 200, description: 'List of distinct providers' })
  findDistinctProviders() {
    return this.hostingOptionService.findDistinctProviders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hosting option by ID' })
  @ApiResponse({ status: 200, description: 'Hosting option found' })
  @ApiResponse({ status: 404, description: 'Hosting option not found' })
  findOne(@Param('id') id: string) {
    return this.hostingOptionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hosting option by ID' })
  @ApiResponse({
    status: 200,
    description: 'Hosting option updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Hosting option not found' })
  update(
    @Param('id') id: string,
    @Body() updateHostingOptionDto: UpdateHostingOptionDto,
  ) {
    return this.hostingOptionService.update(id, updateHostingOptionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete hosting option by ID' })
  @ApiResponse({
    status: 200,
    description: 'Hosting option deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Hosting option not found' })
  remove(@Param('id') id: string) {
    return this.hostingOptionService.delete(id);
  }
}
