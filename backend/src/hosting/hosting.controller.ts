import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { HostingService } from './hosting.service';
import { CreateHostingDto } from './applications/dto/create-hosting.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateHostingDto } from './applications/dto/update-hosting.dto';
import { UserId } from '../common/decorators/user-id.decorator';

@ApiTags('Hostings')
@Controller('applications/:applicationId/hostings')
export class HostingsController {
  constructor(private readonly hostingService: HostingService) {}

  @Post()
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
  @ApiOperation({
    summary: "Récupérer tous les hébergements d'une application",
  })
  @ApiResponse({ status: 200, description: 'Liste des hébergements' })
  findAll(@Param('applicationId') applicationId: string) {
    return this.hostingService.findByApplicationId(applicationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un hébergement par ID pour une application',
  })
  @ApiResponse({ status: 200, description: 'Hébergement trouvé' })
  findOne(@Param('id') id: string) {
    return this.hostingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un hébergement pour une application',
  })
  @ApiResponse({ status: 200, description: 'Hébergement mis à jour' })
  update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHostingDto,
  ) {
    return this.hostingService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un hébergement pour une application' })
  @ApiResponse({ status: 200, description: 'Hébergement supprimé' })
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.hostingService.remove(id, userId);
  }
}
