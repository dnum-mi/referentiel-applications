import { Prisma } from "@prisma/client";

export type ApplicationWithAllRelations = Prisma.ApplicationGetPayload<{
  include: {
    currentStatus: true;
    metadatas: true;
    compliance: true;
    labels: {
      include: {
        labelSource: true;
      };
    };
    tags: true;
    statuses: true;
    actors: {
      include: {
        actorType: true;
      };
    };
    externalRessource: true;
    reports: true;
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
