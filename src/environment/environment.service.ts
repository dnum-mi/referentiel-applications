import { Injectable } from '@nestjs/common';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentService {
  create(createEnvironmentDto: CreateEnvironmentDto) {
    return 'This action adds a new environment';
  }

  findAll() {
    return `This action returns all environment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} environment`;
  }

  update(id: number, updateEnvironmentDto: UpdateEnvironmentDto) {
    return `This action updates a #${id} environment`;
  }

  remove(id: number) {
    return `This action removes a #${id} environment`;
  }
}
