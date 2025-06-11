import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Injectable } from '@nestjs/common';
import { Metadata } from '@prisma/client';

@Injectable()
export class MetadatasService extends BaseService<Metadata> {
  constructor(prisma: PrismaService) {
    super(prisma.metadata, prisma);
  }

  public async createMetadata<T = any>(options: {
    applicationId: string;
    createdById: string;
    entityLabel: string;
    entity?: string;
    entityId?: string;
    fields?: string[];
    fieldLabels?: Record<string, string>;
    oldData?: T;
    newData?: T;
  }) {
    const {
      applicationId,
      createdById,
      entityLabel,
      entity,
      entityId,
      fields,
      fieldLabels = {},
      oldData,
      newData,
    } = options;

    const extractValue = (obj: any, path: string): any => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
    };

    const buildValueMap = (source: any) => {
      const result: Record<string, any> = {};
      for (const field of fields) {
        const label = fieldLabels[field] ?? field;
        result[label] = extractValue(source, field);
      }
      return result;
    };

    const oldValues = oldData ? buildValueMap(oldData) : undefined;
    const newValues = newData ? buildValueMap(newData) : undefined;

    let action: 'add' | 'update' = 'update';
    if (!oldData && !newData) action = 'add';

    const actionLabels = {
      add: 'Ajout',
      update: 'Modification',
    };

    const descriptionLines = [`${actionLabels[action]} ${entityLabel}`];
    if (fields) {
      descriptionLines.push(
        `Ancienne(s) valeur(s): ${JSON.stringify(oldValues)}`,
      );
      descriptionLines.push(
        `Nouvelle(s) valeur(s): ${JSON.stringify(newValues)}`,
      );
    }

    const prismaData: any = {
      applicationId,
      createdById,
      action: fields ? 'update' : 'add',
      description: descriptionLines.join('\n'),
    };

    if (entity && entityId) {
      prismaData[entity] = entityId;
    }

    return this.prisma.metadata.create({ data: prismaData });
  }
}
