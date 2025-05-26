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

  async update(id: string, data: any): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, ownerId?: string): Promise<T> {
    const item = await this.model.findUnique({
      where: { id },
      select: { applicationId: true, metadatas: true },
    });

    if (!item) {
      throw new NotFoundException(`${this.model.name} with ID ${id} not found`);
    }

    if (item.metadatas) {
      await this.prisma.metadata.create({
        data: {
          applicationId: item.applicationId,
          createdById: ownerId,
          action: 'delete',
          description: `Suppression de : ${item.name || item.description || item.value || item.link}`,
        },
      });
    }

    return this.model.delete({ where: { id } });
  }
}
