import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReferenceRepositoryService } from './reference-repository.service';
import { CreateReferenceRepositoryDto } from './dto/create-reference-repository.dto';
import { UpdateReferenceRepositoryDto } from './dto/update-reference-repository.dto';

@Controller('reference-repository')
export class ReferenceRepositoryController {
  constructor(private readonly referenceRepositoryService: ReferenceRepositoryService) {}

  @Post()
  create(@Body() createReferenceRepositoryDto: CreateReferenceRepositoryDto) {
    return this.referenceRepositoryService.create(createReferenceRepositoryDto);
  }

  @Get()
  findAll() {
    return this.referenceRepositoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.referenceRepositoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReferenceRepositoryDto: UpdateReferenceRepositoryDto) {
    return this.referenceRepositoryService.update(+id, updateReferenceRepositoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.referenceRepositoryService.remove(+id);
  }
}
