import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BaseService<T> {
  modelName: any;
  constructor(
    private readonly model: any,
    protected readonly prisma: PrismaService,
  ) {
    this.modelName = model.name ?? model.constructor.name;
  }

  async findOne(id: string): Promise<T> {
    const object = await this.model.findUnique({ where: { id } });
    if (!object) {
      throw new NotFoundException(`${this.model.name} with ID ${id} not found`);
    }
    return object;
  }

  async findAll(filters?: any): Promise<T[]> {
    return this.model.findMany({ where: filters });
  }

  async create(createDto: any): Promise<T> {
    return this.model.create({ data: createDto });
  }

  async update(id: string, data: any, ownerId?: string): Promise<T> {
    const { metadata, ...rest } = data;

    const updated = await this.model.update({
      where: { id },
      data: rest,
    });

    if (this.hasMetadata() && 'metadataId' in updated && updated.metadataId) {
      await this.prisma.metadata.update({
        where: { id: updated.metadataId },
        data: {
          updatedById: ownerId,
          updatedAt: new Date(),
        },
      });
    }

    return updated;
  }

  async delete(id: string, ownerId?: string): Promise<T> {
    await this.findOne(id);

    if (this.hasMetadata()) {
      const item = await this.model.findUnique({
        where: { id },
        select: { metadataId: true },
      });

      if (item?.metadataId) {
        await this.prisma.metadata.update({
          where: { id: item.metadataId },
          data: {
            deletedById: ownerId,
            deletedAt: new Date(),
          },
        });
      }
    }

    return this.model.delete({ where: { id } });
  }

  private hasMetadata(): boolean {
    const modelsWithMetadata = [
      'Application',
      'Actor',
      'Compliance',
      'Event',
      'ExternalRessource',
      'Label',
    ];
    return modelsWithMetadata.includes(this.modelName);
  }
}
