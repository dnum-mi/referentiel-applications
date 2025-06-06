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
    fields: string[];
    fieldLabels?: Record<string, string>;
    oldData: T;
    newData: T;
  }) {
    const {
      applicationId,
      createdById,
      entityLabel,
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

    const descriptionLines = [`${'Modification'} ${entityLabel}`];
    descriptionLines.push(
      `Ancienne(s) valeur(s): ${JSON.stringify(oldValues)}`,
    );
    descriptionLines.push(
      `Nouvelle(s) valeur(s): ${JSON.stringify(newValues)}`,
    );

    return this.prisma.metadata.create({
      data: {
        applicationId,
        createdById,
        action: 'update',
        description: descriptionLines.join('\n'),
      },
    });
  }
}
