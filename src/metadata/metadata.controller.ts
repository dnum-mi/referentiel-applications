import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { CreateMetadatumDto } from './dto/create-metadatum.dto';
import { UpdateMetadatumDto } from './dto/update-metadatum.dto';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Post()
  create(@Body() createMetadatumDto: CreateMetadatumDto) {
    return this.metadataService.create(createMetadatumDto);
  }

  @Get()
  findAll() {
    return this.metadataService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.metadataService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMetadatumDto: UpdateMetadatumDto) {
    return this.metadataService.update(+id, updateMetadatumDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.metadataService.remove(+id);
  }
}
