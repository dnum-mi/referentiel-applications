import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HostingService } from './hosting.service';
import { CreateHostingDto } from './applications/dto/create-hosting.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateHostingDto } from './applications/dto/update-hosting.dto';
import { UserId } from '../common/decorators/user-id.decorator';
import { ApplicationGuard } from 'src/common/guards/application.guard';
import { AppAction } from 'src/common/decorators/application.decorator';

@ApiTags('Hostings')
@Controller('hostings')
export class HostingController {
  constructor(private readonly hostingService: HostingService) {}

  @Get('count')
  @ApiOperation({
    summary: "Récupérer le nombre total d'hébergements (toutes applications)",
  })
  public async countAllHostings(): Promise<number> {
    return this.hostingService.count();
  }
}

@ApiTags('Hostings')
@UseGuards(ApplicationGuard)
@Controller('applications/:applicationId/hostings')
export class ApplicationHostingsController {
  constructor(private readonly hostingService: HostingService) {}

  @Post()
  @AppAction('writeHostings')
  @ApiOperation({ summary: 'Créer un hébergement pour une application' })
  @ApiResponse({ status: 201, description: 'Hébergement créé' })
  create(
    @UserId() userId: string,
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateHostingDto,
  ) {
    // Ajoute l'ID de l'application provenant de l'URL dans le DTO
    return this.hostingService.create({ ...dto, applicationId }, userId);
  }

  @Get()
  @AppAction('readHostings')
  @ApiOperation({
    summary: "Récupérer tous les hébergements d'une application",
  })
  @ApiResponse({ status: 200, description: 'Liste des hébergements' })
  findAll(@Param('applicationId') applicationId: string) {
    return this.hostingService.findByApplicationId(applicationId);
  }

  @Get(':id')
  @AppAction('readHostings')
  @ApiOperation({
    summary: 'Récupérer un hébergement par ID pour une application',
  })
  @ApiResponse({ status: 200, description: 'Hébergement trouvé' })
  findOne(@Param('id') id: string) {
    return this.hostingService.findOne(id);
  }

  @Patch(':id')
  @AppAction('writeHostings')
  @ApiOperation({
    summary: 'Mettre à jour un hébergement pour une application',
  })
  @ApiResponse({ status: 200, description: 'Hébergement mis à jour' })
  update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateHostingDto,
  ) {
    return this.hostingService.update(id, { ...dto, applicationId }, userId);
  }

  @Delete(':id')
  @AppAction('writeHostings')
  @ApiOperation({ summary: 'Supprimer un hébergement pour une application' })
  @ApiResponse({ status: 200, description: 'Hébergement supprimé' })
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.hostingService.remove(id, userId);
  }
}
