import { Controller, Post, Body } from '@nestjs/common';
import { RelationService } from './relation.service';
import { CreateRelationDto } from './application/dto/relation-application.dto';
import { Relation } from './domain/relation.entity';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('relation')
@Controller('relations')
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post()
  async create(@Body() dto: CreateRelationDto): Promise<Relation> {
    return this.relationService.create(dto);
  }
}
