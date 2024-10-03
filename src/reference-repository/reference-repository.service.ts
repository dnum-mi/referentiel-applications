import { Injectable } from '@nestjs/common';
import { CreateReferenceRepositoryDto } from './dto/create-reference-repository.dto';
import { UpdateReferenceRepositoryDto } from './dto/update-reference-repository.dto';

@Injectable()
export class ReferenceRepositoryService {
  create(createReferenceRepositoryDto: CreateReferenceRepositoryDto) {
    return 'This action adds a new referenceRepository';
  }

  findAll() {
    return `This action returns all referenceRepository`;
  }

  findOne(id: number) {
    return `This action returns a #${id} referenceRepository`;
  }

  update(id: number, updateReferenceRepositoryDto: UpdateReferenceRepositoryDto) {
    return `This action updates a #${id} referenceRepository`;
  }

  remove(id: number) {
    return `This action removes a #${id} referenceRepository`;
  }
}
