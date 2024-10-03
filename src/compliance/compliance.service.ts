import { Injectable } from '@nestjs/common';
import { CreateComplianceDto } from './dto/create-compliance.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';

@Injectable()
export class ComplianceService {
  create(createComplianceDto: CreateComplianceDto) {
    return 'This action adds a new compliance';
  }

  findAll() {
    return `This action returns all compliance`;
  }

  findOne(id: number) {
    return `This action returns a #${id} compliance`;
  }

  update(id: number, updateComplianceDto: UpdateComplianceDto) {
    return `This action updates a #${id} compliance`;
  }

  remove(id: number) {
    return `This action removes a #${id} compliance`;
  }
}
