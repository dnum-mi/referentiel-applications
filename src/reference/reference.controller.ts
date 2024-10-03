import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReferenceService } from './reference.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';

@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Post()
  create(@Body() createReferenceDto: CreateReferenceDto) {
    return this.referenceService.create(createReferenceDto);
  }

  @Get()
  findAll() {
    return this.referenceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.referenceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReferenceDto: UpdateReferenceDto) {
    return this.referenceService.update(+id, updateReferenceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.referenceService.remove(+id);
  }
}
