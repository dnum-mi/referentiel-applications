import { Controller, Get, Post, Body, Put, Param } from '@nestjs/common';
import { UrbanzonesService } from './urbanzones.service';
import { CreateUrbanzoneDto } from './dto/create-urbanzone.dto';
import { UpdateUrbanzoneDto } from './dto/update-urbanzone.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Urbanzone')
@Controller('urbanzones')
export class UrbanzonesController {
  constructor(private readonly urbanzonesService: UrbanzonesService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createInstanceDto: CreateUrbanzoneDto,
  ) {
    //TODO:
    return await this.urbanzonesService.create({
      ...createInstanceDto,
      ...{ createdby: user.username, updatedby: user.username },
    } as any);
  }

  @Get()
  async findAll() {
    return await this.urbanzonesService.getAll();
  }

  @Get(':id')
  async findOne(@Param() params: UUIDParam) {
    return await this.urbanzonesService.getOneBy({ urbanzoneid: params.id });
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateInstanceDto: UpdateUrbanzoneDto,
  ) {
    return await this.urbanzonesService.updateOneBy(
      { urbanzoneid: params.id },
      { ...updateInstanceDto, ...{ updatedby: user.username } },
    );
  }

  @Get('application/:id')
  async getUrbanZonesByAppId(@Param() params: UUIDParam) {
    return this.urbanzonesService.getAll({
      where: {
        fctUrbanzoneapplication: {
          some: {
            applicationid: params.id,
          },
        },
      },
    });
  }
}
