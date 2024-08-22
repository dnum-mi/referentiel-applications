import {
  Body,
  Controller,
  Get,
  Logger,
  NotAcceptableException,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { ApiTags } from '@nestjs/swagger';
import { FilterApplicationsDto } from './dto/filter-applications.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Resource } from '../auth/policies-guard.guard';
import _ from 'lodash';

@Resource('Application')
@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Get('/status')
  async getStatuses() {
    return this.prisma.appStatus.findMany();
  }

  @Get('/sensibilites')
  async getSensibilites() {
    return this.prisma.refSensitivity.findMany();
  }

  @Get('/app-types')
  async getAppTypes() {
    return this.prisma.appType.findMany();
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    const application =
      await this.applicationsService.getOneByNameAndOrgnisation(
        createApplicationDto.longname!,
        createApplicationDto.organisation,
        createApplicationDto.organisationid,
      );

    if (application) {
      throw new NotAcceptableException(
        `Le nom et l'organisation de l'application doivent être uniques!`,
      );
    }

    const result = await this.applicationsService.createApplication(
      user.username,
      createApplicationDto,
    );

    if (typeof result === 'string') {
      throw new NotFoundException(result);
    }

    return result;
  }

  @Get()
  async getAll(
    @CurrentUser() user: User,
    @Query() filters: FilterApplicationsDto,
  ) {
    return await this.applicationsService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
      nom: filters.nom,
      statut: filters.statut,
      sensibilite: filters.sensibilite,
      parentOnly: filters.parent,
    });
  }

  @Get(':id')
  async findOne(@Param() params: UUIDParam) {
    const res = await this.applicationsService.getOneById(params.id);

    if (!res) {
      throw new NotFoundException(`Resource with id ${params.id} not found`);
    }

    return res;
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    const application =
      await this.applicationsService.getOneByNameAndOrgnisation(
        updateApplicationDto.longname!,
        updateApplicationDto.organisation,
        updateApplicationDto.organisationid,
      );

    if (application && application.applicationid !== params.id) {
      throw new NotAcceptableException(
        `Le nom et l'organisation de l'application doivent être uniques!`,
      );
    }

    const sanitizedUpdateDto = _.omit(updateApplicationDto, 'createdat');

    const result = await this.applicationsService.updateApplication(
      user.username,
      params.id,
      sanitizedUpdateDto,
    );


    if (typeof result === 'string') {
      throw new NotFoundException(result);
    }

    return result;
  }

  @Get(':id/applications')
  async getApplicationsByAppId(@Param() params: UUIDParam) {
    return await this.applicationsService.getAllBy({
      parentId: params.id,
    });
  }
}
