import { Prisma } from '@prisma/client';

export type ApplicationWithAllRelations = Prisma.ApplicationGetPayload<{
  include: {
    currentStatus: true;
    metadatas: true;
    compliance: true;
    labels: true;
    tags: true,
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
    hostings: {
      include: {
        hostingOption: true;
      };
    };
  };
}>;
