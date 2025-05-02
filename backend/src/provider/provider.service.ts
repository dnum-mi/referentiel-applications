import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from 'src/common/base.service';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProviderService extends BaseService<Provider> {
  constructor(prisma: PrismaService) {
    super(prisma.provider);
  }
}
