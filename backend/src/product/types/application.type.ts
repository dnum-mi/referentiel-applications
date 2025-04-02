import { Prisma } from '@prisma/client';

export type ApplicationWithAllRelations = Prisma.ApplicationGetPayload<{
  include: {
    metadata: true;
    compliances: true;
    labels: true;
    actors: true;
    relationsAsSource: {
      include: { targetApplication: true };
    };
    relationsAsTarget: {
      include: { sourceApplication: true };
    };
    events: true;
    hostings: true;
    owner: true;
  };
}>;
