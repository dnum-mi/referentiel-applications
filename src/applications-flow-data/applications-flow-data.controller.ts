import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApplicationsFlowDataService } from './applications-flow-data.service';
import { CreateApplicationsFlowDataDto } from './dto/create-applications-flow-data.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';


@Controller('flowdata')
export class ApplicationsFlowDataController {
  constructor(
    private readonly applicationsFlowDataService: ApplicationsFlowDataService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createInstanceDto: CreateApplicationsFlowDataDto,
  ) {
    //TODO:
    return await this.applicationsFlowDataService.create({
      ...createInstanceDto,
      ...{ createdby: user.username, updatedby: user.username },
    } as any);
  }

  @Get()
  async findAll() {
    return await this.applicationsFlowDataService.getAll();
  }

  // @Get(':id')
  // async findOne(@Param() params: UUIDParam) {
  //   return await this.applicationsFlowDataService.getOneBy({
  //     dataid: params.id,
  //   });
  // }

  // @Put(':id')
  // async update(
  //   @Param() params: UUIDParam,
  //   @Body() updateInstanceDto: UpdateApplicationsFlowDataDto,
  // ) {
  //   return await this.applicationsFlowDataService.updateOneBy(
  //     { dataid: params.id },
  //     updateInstanceDto,
  //   );
  // }

  @Get('application/:id')
  async getAssocDataflowsByAppId(@Param() params: UUIDParam) {
    return await this.applicationsFlowDataService.getAll({
      where: {
        appFlow: {
          OR: [
            { applicationsourceid: params.id },
            {
              applicationtargetid: params.id,
            },
          ],
        },
      },
    });
  }
}
