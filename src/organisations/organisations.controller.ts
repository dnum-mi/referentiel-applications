import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { IDParam, UUIDParam } from '../global-dto/uuid-param.dto';
import { FilterOrganisationsDto } from './dto/filter-organisations.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Organisation } from './entities/organisation.entity';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

@Controller('organisations')
@ApiTags('Organisations')
export class OrganisationsController {
  constructor(private organisationsService: OrganisationsService) {}

  @Get()
  async getAll(@Query() filters: FilterOrganisationsDto) {
    return await this.organisationsService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
      label: filters.label,
      code: filters.code,
      parentOnly: filters.parent,
    });
  }

  @Get(':id')
  async getOrganisation(
    @Param() idOrCode: IDParam,
  ): Promise<Organisation | null> {
    const organisation = await this.organisationsService.getOneByCode(
      idOrCode.id,
    );

    if (!organisation)
      throw new NotFoundException(
        `Resource with id-code ${idOrCode.id} not found`,
      );

    return organisation;
  }

  @Post()
  async createOrganisation(
    @CurrentUser() user: User,
    @Body() createOrganisationDto: CreateOrganisationDto,
  ): Promise<Organisation | null> {
    const Organisation = await this.organisationsService.create(
      user.username,
      createOrganisationDto,
    );

    if (!Organisation) throw new UnprocessableEntityException();

    return Organisation;
  }

  @Put(':id')
  async updateOrganisation(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateOrganisationDto: UpdateOrganisationDto,
  ): Promise<Organisation | null> {
    const Organisation = await this.organisationsService.updateOneById(
      user.username,
      params.id,
      updateOrganisationDto,
    );

    if (!Organisation)
      throw new NotFoundException(`Resource with id ${params.id} not found`);

    return Organisation;
  }
}
