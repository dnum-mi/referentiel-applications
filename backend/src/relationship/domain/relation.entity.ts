import { RelationType } from '@prisma/client';

export interface Relation {
  applicationSource: string;
  applicationTarget: string;
  type: RelationType;
}
