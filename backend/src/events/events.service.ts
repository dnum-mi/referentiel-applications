import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { MetadatasService } from '../metadatas/metadatas.service';

@Injectable()
export class EventsService extends BaseService<Event> {
  constructor(
    prisma: PrismaService,
    private readonly metadatasService: MetadatasService,
  ) {
    super(prisma.event);
  }
}
