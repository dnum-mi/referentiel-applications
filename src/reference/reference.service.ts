import { Injectable } from '@nestjs/common';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';

@Injectable()
export class ReferenceService {
  create(createReferenceDto: CreateReferenceDto) {
    return 'This action adds a new reference';
  }

  findAll() {
    return `This action returns all reference`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reference`;
  }

  update(id: number, updateReferenceDto: UpdateReferenceDto) {
    return `This action updates a #${id} reference`;
  }

  remove(id: number) {
    return `This action removes a #${id} reference`;
  }
}
