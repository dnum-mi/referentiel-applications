import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BaseService<T> {
  constructor(
    private readonly model: any,
    protected readonly prisma: PrismaService,
  ) {}

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
    const updated = await this.model.update({
      where: { id },
      data,
      include: { metadata: true },
    });

    if (updated.metadata?.id) {
      await this.prisma.metadata.update({
        where: { id: updated.metadata?.id },
        data: {
          updatedById: ownerId,
          updatedAt: new Date(),
        },
      });
    }

    const { metadata, ...rest } = updated;
    return rest as T;
  }

  async delete(id: string, ownerId?: string): Promise<T> {
    await this.findOne(id);

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
    return this.model.delete({ where: { id } });
  }
}
