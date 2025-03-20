import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { RelationService } from './relation.service';
import { RelationApplicationDto } from './application/dto/relation-application.dto';
import { Relation } from './domain/relation.entity';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('relation')
@Controller('relations')
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle relation' })
  async create(@Body() dto: RelationApplicationDto): Promise<Relation> {
    return this.relationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les relations' })
  async findAll(): Promise<Relation[]> {
    return this.relationService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une relation par son identifiant unique',
  })
  @ApiParam({ name: 'id', description: 'Identifiant unique de la relation' })
  async findOne(@Param('id') id: string): Promise<Relation> {
    return this.relationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une relation' })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique de la relation à mettre à jour',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: RelationApplicationDto,
  ): Promise<Relation> {
    return this.relationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une relation' })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique de la relation à supprimer',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.relationService.delete(id);
  }
}
