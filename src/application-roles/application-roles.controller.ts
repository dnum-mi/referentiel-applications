import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationRolesService } from './application-roles.service';
import { CreateApplicationRoleDto } from './dto/create-application-role.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FilterApplicationRolesDto } from './dto/filter-application-role.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';
import { Resource } from '../auth/policies-guard.guard';
import { ApiTags } from '@nestjs/swagger';

@Resource('Role')
@Controller('application-roles')
@ApiTags('Application-Roles')
export class ApplicationRolesController {
  constructor(
    private readonly env: EnvironmentVariablesService,

    private readonly applicationRolesService: ApplicationRolesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('application/:id')
  async getApplicationRolesByAppId(
    @Param() params: UUIDParam,
    @Query() filters: FilterApplicationRolesDto,
  ) {
    return this.applicationRolesService.getAllBy({
      applicationId: params.id,
      ...filters,
    });
  }

  @Post(':id/application-roles')
  async updateOrCreateApplicationRoleByAppId(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() createApplicationRoleDto: CreateApplicationRoleDto,
  ) {
    const role =
      await this.applicationRolesService.updateOrCreateApplicationRoleByAppId(
        user.username,
        params.id,
        createApplicationRoleDto,
      );

    if (typeof role === 'string') {
      throw new NotFoundException(role);
    }

    return role;
  }
}
