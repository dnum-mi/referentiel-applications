import { Controller, Get, Post, Body, Put, Param, Query } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { CreateCapabilityDto } from './dto/create-capability.dto';
import { UpdateCapabilityDto } from './dto/update-capability.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { FilterCapabilitysDto } from './dto/filter-capability.dto';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from '../current-user/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Capabilities')
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly capabilitiesService: CapabilitiesService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createCapabilityDto: CreateCapabilityDto,
  ) {
    return await this.capabilitiesService.create(
      user.username,
      createCapabilityDto,
    );
  }

  @Get()
  async getAll(@Query() filters: FilterCapabilitysDto) {
    return await this.capabilitiesService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
    });
  }

  @Get(':id')
  async findOne(@Param() params: UUIDParam) {
    return await this.capabilitiesService.getOneById(params.id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateCapabilityDto: UpdateCapabilityDto,
  ) {
    return await this.capabilitiesService.updateOneById(
      user.username,
      params.id,
      updateCapabilityDto,
    );
  }

  @Get('/application/:id')
  async getCapacitesByAppId(
    @Param() params: UUIDParam,
    @Query() filters: FilterCapabilitysDto,
  ) {
    return await this.capabilitiesService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
      applicationId: params.id,
    });
  }
}
