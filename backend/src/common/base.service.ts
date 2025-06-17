import { Injectable, NotFoundException } from '@nestjs/common';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BaseService<T> {
  constructor(
    private readonly model: any,
    protected readonly prisma: PrismaService,
    private readonly metadatasService?: MetadatasService,
  ) { }

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

  async delete(id: string): Promise<T> {
    await this.findOne(id);
    return this.model.delete({ where: { id } });
  }

  async updateWithMetadata(options: {
    id: string,
    data: any,
    userId: string,
    applicationId: string,
    gender: string,
    entityName: string,
    metadataFields: Record<string, string>,
    getName?: (entity: T) => string,
  }): Promise<T> {
    const oldEntity = await this.findOne(options.id);

    const updatedEntity = await this.update(options.id, options.data);

    await this.metadatasService.createMetadata({
      applicationId: options.applicationId,
      createdById: options.userId,
      title: `${options.gender} ${options.getName?.(updatedEntity) ?? ''}`,
      entity: options.entityName,
      entityId: options.id,
      fields: options.metadataFields,
      oldData: oldEntity,
      newData: updatedEntity,
    });

    return updatedEntity;
  }
}
