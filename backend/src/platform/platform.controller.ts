import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { CreatePlatformDto, UpdatePlatformDto } from './dto/platform.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { FiltersDto } from './dto/filters.dto';

@ApiTags('Platforms')
@Controller('platforms')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new platform' })
  @ApiResponse({ status: 201, description: 'Platform created successfully' })
  create(@Body() createPlatformDto: CreatePlatformDto) {
    return this.platformService.create(createPlatformDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all platforms with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of platforms' })
  @ApiQuery({ type: FiltersDto })
  findAll(@Query() filters: FiltersDto) {
    return this.platformService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get platform by ID' })
  @ApiResponse({ status: 200, description: 'Platform found' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  findOne(@Param('id') id: string) {
    return this.platformService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update platform by ID' })
  @ApiResponse({ status: 200, description: 'Platform updated successfully' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  update(
    @Param('id') id: string,
    @Body() updatePlatformDto: UpdatePlatformDto,
  ) {
    return this.platformService.update(id, updatePlatformDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete platform by ID' })
  @ApiResponse({ status: 200, description: 'Platform deleted successfully' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  remove(@Param('id') id: string) {
    return this.platformService.delete(id);
  }
}
