import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';

@Injectable()
export class LinksService extends BaseService<Event> {
  constructor(prisma: PrismaService) {
    super(prisma.externalRessource, prisma);
  }
}
