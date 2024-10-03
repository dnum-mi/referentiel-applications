import { Injectable } from '@nestjs/common';
import { CreateMetadatumDto } from './dto/create-metadatum.dto';
import { UpdateMetadatumDto } from './dto/update-metadatum.dto';

@Injectable()
export class MetadataService {
  create(createMetadatumDto: CreateMetadatumDto) {
    return 'This action adds a new metadatum';
  }

  findAll() {
    return `This action returns all metadata`;
  }

  findOne(id: number) {
    return `This action returns a #${id} metadatum`;
  }

  update(id: number, updateMetadatumDto: UpdateMetadatumDto) {
    return `This action updates a #${id} metadatum`;
  }

  remove(id: number) {
    return `This action removes a #${id} metadatum`;
  }
}
