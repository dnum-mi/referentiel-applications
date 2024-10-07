import { Controller, Get, Param } from '@nestjs/common';
import { InstancesService } from './instances.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Resource } from '../auth/policies-guard.guard';
import { UUIDParam } from 'src/global-dto/uuid-param.dto';
import { ApiExcludeController } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Resource('Instance')
@ApiTags('Instances')
@Controller('instances')
@ApiExcludeController()
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
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: "Obtenir toutes les instances d'une application",
    description:
      'Récupère toutes les instances associées à une application spécifique, identifiée par son ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des instances récupérée avec succès.',
  })
  @ApiResponse({
    status: 404,
    description: "Aucune instance trouvée pour l'ID d'application spécifié.",
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
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
