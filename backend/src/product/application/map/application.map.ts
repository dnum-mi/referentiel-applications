import { CreateApplicationDto } from '../dto/create-application.dto';

export const applicationMap = (
  createApplicationDto: CreateApplicationDto,
  applicationMetadataId,
  ownerId,
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
    },
    include: {
      metadata: true,
      compliances: true,
      externalRessource: true,
    },
  };
};
