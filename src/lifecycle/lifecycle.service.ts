import { Injectable } from '@nestjs/common';
import { CreateLifecycleDto } from './dto/create-lifecycle.dto';
import { UpdateLifecycleDto } from './dto/update-lifecycle.dto';

@Injectable()
export class LifecycleService {
  create(createLifecycleDto: CreateLifecycleDto) {
    return 'This action adds a new lifecycle';
  }

  findAll() {
    return `This action returns all lifecycle`;
  }

  findOne(id: number) {
    return `This action returns a #${id} lifecycle`;
  }

  update(id: number, updateLifecycleDto: UpdateLifecycleDto) {
    return `This action updates a #${id} lifecycle`;
  }

  remove(id: number) {
    return `This action removes a #${id} lifecycle`;
  }
}
