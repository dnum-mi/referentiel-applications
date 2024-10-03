import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { CreateLifecycleDto } from './dto/create-lifecycle.dto';
import { UpdateLifecycleDto } from './dto/update-lifecycle.dto';

@Controller('lifecycle')
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Post()
  create(@Body() createLifecycleDto: CreateLifecycleDto) {
    return this.lifecycleService.create(createLifecycleDto);
  }

  @Get()
  findAll() {
    return this.lifecycleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lifecycleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLifecycleDto: UpdateLifecycleDto) {
    return this.lifecycleService.update(+id, updateLifecycleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lifecycleService.remove(+id);
  }
}
