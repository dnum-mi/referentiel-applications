import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { HostingSiteService } from './hosting-site.service';
import {
  CreateHostingSiteDto,
  UpdateHostingSiteDto,
} from './dto/hosting-site.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('HostingSites')
@Controller('hosting-sites')
export class HostingSiteController {
  constructor(private readonly hostingSiteService: HostingSiteService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hosting site' })
  @ApiResponse({
    status: 201,
    description: 'Hosting site created successfully',
  })
  create(@Body() createHostingSiteDto: CreateHostingSiteDto) {
    return this.hostingSiteService.create(createHostingSiteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all hosting sites' })
  @ApiResponse({ status: 200, description: 'List of hosting sites' })
  findAll() {
    return this.hostingSiteService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hosting site by ID' })
  @ApiResponse({ status: 200, description: 'Hosting site found' })
  @ApiResponse({ status: 404, description: 'Hosting site not found' })
  findOne(@Param('id') id: string) {
    return this.hostingSiteService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hosting site by ID' })
  @ApiResponse({
    status: 200,
    description: 'Hosting site updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Hosting site not found' })
  update(
    @Param('id') id: string,
    @Body() updateHostingSiteDto: UpdateHostingSiteDto,
  ) {
    return this.hostingSiteService.update(id, updateHostingSiteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete hosting site by ID' })
  @ApiResponse({
    status: 200,
    description: 'Hosting site deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Hosting site not found' })
  remove(@Param('id') id: string) {
    return this.hostingSiteService.delete(id);
  }
}
