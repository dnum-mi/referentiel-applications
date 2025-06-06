import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';

@Injectable()
export class EventsService extends BaseService<Event> {
  constructor(prisma: PrismaService) {
    super(prisma.event, prisma);
  }

  public async deleteEvent(id: string, ownerId: string) {
    const deletedEvent = await this.prisma.event.findFirst({
      where: { id },
      select: { applicationId: true, description: true },
    });

    await this.prisma.metadata.create({
      data: {
        action: 'delete',
        applicationId: deletedEvent.applicationId,
        description: "Suppression de l'événement : " + deletedEvent.description,
        createdById: ownerId,
      },
    });

    await this.prisma.event.delete({ where: { id } });
  }
}
