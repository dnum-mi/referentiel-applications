import { Controller, Get, Param } from '@nestjs/common';
import { InstancesService } from './instances.service';
import { ApiTags } from '@nestjs/swagger';
import { Resource } from '../auth/policies-guard.guard';
import { UUIDParam } from 'src/global-dto/uuid-param.dto';

@Resource('Instance')
@ApiTags('Instances')
@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  // @Post()
  // async create(
  //   @CurrentUser() user: User,
  //   @Body() createInstanceDto: CreateInstanceDto,
  // ) {
  //   //TODO:
  //   return await this.instancesService.create(user.username, createInstanceDto);
  // }

  @Get('/application/:id')
  async findAll(@Param() params: UUIDParam) {
    return await this.instancesService.getAll({
      where: {
        applicationid: params.id,
      },
    });
  }

  // // @Get(':id')
  // // async findOne(@Param() params: UUIDParam) {
  // //   return await this.instancesService.getOneBy({ instanceid: params.id });
  // // }

  // // @Put(':id')
  // // async update(
  // //   @Param() params: UUIDParam,
  // //   @Body() updateInstanceDto: UpdateInstanceDto,
  // // ) {
  // //   return await this.instancesService.updateOneBy(
  // //     { instanceid: params.id },
  // //     updateInstanceDto,
  // //   );
  // // }

  // @Get('application/:id')
  // async getInstancesByAppId(@Param() params: UUIDParam) {
  //   return await this.instancesService.getAll({
  //     where: {
  //       applicationid: params.id,
  //     },
  //   });
  // }
}
