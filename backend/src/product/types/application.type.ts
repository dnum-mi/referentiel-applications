import { Prisma } from '@prisma/client';

export type ApplicationWithAllRelations = Prisma.ApplicationGetPayload<{
  include: {
    metadata: true;
    compliances: true;
    labels: true;
    actors: {
      include: {
        actorType: true;
      };
    };
    externalRessource: true;
    anomalyNotification: true;
    relationsAsSource: {
      include: { targetApplication: true };
    };
    relationsAsTarget: {
      include: { sourceApplication: true };
    };
    events: true;
    hostings: {
      include: {
        hostingOption: true;
      };
    };
    owner: true;
  };
}>;
