import {
  Body,
  Controller,
  Get,
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
import { Application } from './entities/application.entity';
import { Resource } from '../auth/policies-guard.guard';

//TODO: Refactor clean the code!
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

  private async updateOrCreate(
    user: User,
    inputData: CreateApplicationDto | UpdateApplicationDto,
    isCreating: boolean,
    applicationId?: string,
  ) {
    const application: Application | null =
      await this.applicationsService.getOneByNameAndOrgnisation(
        inputData.longname!,
        inputData.organisation,
        inputData.organisationid,
      );

    if (application && application.applicationid !== applicationId) {
      throw new NotAcceptableException(
        `Le nom et l'organisation de l'application doivent être uniques!`,
      );
    }

    // if (!isCreating && applicationId) {
    //   // updating
    //   application = await this.applicationsService.getOneById(applicationId);

    // if (!application) {
    //   throw new NotFoundException(`Application ${applicationId} doesn't exist`);
    // }
    //}

    const result = await this.applicationsService.updateOrCreate(
      user.username,
      inputData,
      isCreating,
      application ?? applicationId,
    );

    if (typeof result === 'string') {
      throw new NotFoundException(result);
    }

    return result;
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body()
    createApplicationDto: CreateApplicationDto,
  ) {
    return this.updateOrCreate(user, createApplicationDto, true);
  }

  @Get()
  async getAll(
    @CurrentUser() user: User,
    @Query() filters: FilterApplicationsDto,
  ) {
    const orderBy = {} as any;
    for (const sort of filters.sort ?? []) {
      orderBy[sort.key] = sort.order;
      // switch (sort) {
      //   case 'nom': {
      //     orderBy['longname'] = 'asc';
      //     break;
      //   }
      //   case 'statut': {
      //     orderBy['appStatus'] = {
      //       applicationstatuscode: 'asc',
      //     };
      //     break;
      //   }
      //   case 'sensibilite': {
      //     orderBy['refSensitivity'] = {
      //       sensitivitycode: 'asc',
      //     };
      //     break;
      //   }
      // }
    }

    return await this.applicationsService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
      // orderBy,
      nom: filters.nom,
      statut: filters.statut,
      sensibilite: filters.sensibilite,
      parentOnly: filters.parent,
    });
  }

  @Get(':id')
  async findOne(@Param() params: UUIDParam) {
    const res = await this.applicationsService.getOneById(params.id);

    if (!res)
      throw new NotFoundException(`Resource with id ${params.id} not found`);

    return res;
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.updateOrCreate(user, updateApplicationDto, false, params.id);
  }

  @Get(':id/applications')
  async getApplicationsByAppId(@Param() params: UUIDParam) {
    return await this.applicationsService.getAllBy({
      parentId: params.id,
    });
  }
}
