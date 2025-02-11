import { CreateApplicationDto } from '../dto/create-application.dto';

export const applicationMap = (
  createApplicationDto: CreateApplicationDto,
  applicationMetadataId,
  ownerId,
  actorsToCreate,
) => {
  return {
    data: {
      label: createApplicationDto.label,
      shortName: createApplicationDto.shortName || null,
      logo: createApplicationDto.logo || null,
      description: createApplicationDto.description,
      purposes: createApplicationDto.purposes,
      tags: createApplicationDto.tags,
      metadata: { connect: { id: applicationMetadataId } },
      owner: { connect: { keycloakId: ownerId } },
      lifecycle: {
        create: {
          status: createApplicationDto.lifecycle.status,
          firstProductionDate: new Date(
            createApplicationDto.lifecycle.firstProductionDate || null,
          ),
          plannedDecommissioningDate: createApplicationDto.lifecycle
            .plannedDecommissioningDate
            ? new Date(
                createApplicationDto.lifecycle.plannedDecommissioningDate,
              )
            : undefined,
          metadata: { connect: { id: applicationMetadataId } },
        },
      },
      actors: {
        create: actorsToCreate,
      },
      compliances: {
        create: createApplicationDto.compliances.map((compliance) => ({
          ...compliance,
          validityStart: compliance.validityStart
            ? new Date(compliance.validityStart)
            : undefined,
          validityEnd: compliance.validityEnd
            ? new Date(compliance.validityEnd)
            : undefined,
        })),
      },
      externalRessource: {
        create: Array.isArray(createApplicationDto.externalRessource)
          ? createApplicationDto.externalRessource.map(
              (externalRessourceDto) => ({
                link: externalRessourceDto.link,
                description: externalRessourceDto.description,
                type: externalRessourceDto.type,
              }),
            )
          : [],
      },
      parent: createApplicationDto.parentId
        ? { connect: { id: createApplicationDto.parentId } }
        : undefined,
    },
    include: {
      lifecycle: { include: { metadata: true } },
      metadata: true,
      actors: {
        include: { user: true },
      },
      compliances: true,
      externalRessource: true,
    },
  };
};
