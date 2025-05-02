import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from 'src/common/base.service';
import { Platform } from './entities/platform.entity';

@Injectable()
export class PlatformService extends BaseService<Platform> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.platform);
  }
}
