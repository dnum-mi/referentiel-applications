import { Injectable } from '@nestjs/common';
import { CreateComplianceDto } from './dto/create-compliance.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompliancesService {
  constructor(private readonly prisma: PrismaService) {}

  async getComplianceByAppId(id: string) {
    return this.prisma.appCompliance.findMany({
      where: {
        applicationid: id,
      },
    });
  }

  async updateOrCreateCompliancesServiceByAppId(
    username: string,
    applicationid: string,
    inputData: CreateComplianceDto,
  ) {
    return await this.prisma.appCompliance.upsert({
      where: {
        applicationid_compliancetype: {
          applicationid,
          compliancetype: inputData.compliancetype!,
        },
      },
      create: {
        ...inputData,
        ...{ updatedby: username, createdby: username, applicationid },
      },
      update: {
        ...inputData,
        ...{ updatedby: username, applicationid },
      },
    });
  }
}
