import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Injectable()
export class EventsService extends BaseService<Event> {
  constructor(prisma: PrismaService, metadatasService: MetadatasService) {
    super(prisma.event, prisma, metadatasService);
  }
}
