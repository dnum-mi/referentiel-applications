// link.entity.ts

import type { ExternalRessourceType } from "@prisma/client";

export class Link {
  id: string;
  link: string;
  description?: string;
  type: ExternalRessourceType;
  applicationId: string;
}
