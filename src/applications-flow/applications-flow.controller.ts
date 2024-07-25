import { Controller, Get, Post, Body, Put, Param } from '@nestjs/common';
import { ApplicationsFlowService } from './applications-flow.service';
import { CreateApplicationsFlowDto } from './dto/create-applications-flow.dto';
import { UpdateApplicationsFlowDto } from './dto/update-applications-flow.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Applications')
@Controller('flow')
export class ApplicationsFlowController {
  constructor(
    private readonly applicationsFlowService: ApplicationsFlowService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createInstanceDto: CreateApplicationsFlowDto,
  ) {
    //TODO:
    return await this.applicationsFlowService.create({
      ...createInstanceDto,
      ...{ createdby: user.username, updatedby: user.username },
    } as any);
  }

  @Get()
  async findAll() {
    return await this.applicationsFlowService.getAll();
  }

  @Get(':id')
  async findOne(@Param() params: UUIDParam) {
    return await this.applicationsFlowService.getOneBy({ flowid: params.id });
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateInstanceDto: UpdateApplicationsFlowDto,
  ) {
    return await this.applicationsFlowService.updateOneBy(
      { flowid: params.id },
      {
        ...updateInstanceDto,
        ...{ updatedby: user.username },
      },
    );
  }

  @Get('application/:id')
  async getDataflowsByAppId(@Param() params: UUIDParam) {
    return await this.applicationsFlowService.getAll({
      where: {
        OR: [
          { applicationsourceid: params.id },
          {
            applicationtargetid: params.id,
          },
        ],
      },
    });
  }
}
