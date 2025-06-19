import { Injectable } from '@nestjs/common';
import { calculateIQ } from 'src/common/utils/quality.utils';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApplicationQualityService {
  constructor(private prisma: PrismaService) {}

  async updateApplicationQuality(applicationId: string) {
    const iq = await calculateIQ(applicationId, this.prisma);
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { quality: iq },
    });
  }
}
