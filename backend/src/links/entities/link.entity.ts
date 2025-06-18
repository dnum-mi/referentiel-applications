// link.entity.ts

import { ExternalRessourceType } from '@prisma/client';

export class Link {
  id: string;
  link: string;
  description?: string;
  type: ExternalRessourceType;
  applicationId: string;
}
