import { RelationType } from '@prisma/client';

export interface Relation {
  applicationSourceId: string;
  applicationTargetId: string;
  sourceApplication: {
    id: string;
    label: string;
  };
  targetApplication: {
    id: string;
    label: string;
  };
  type: RelationType;
}
