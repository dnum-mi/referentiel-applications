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
      labels: {
        create: (createApplicationDto.labels || []).map((label) => ({
          source: label.source,
          value: label.value,
          shortname: label.shortname || null,
          metadata: { connect: { id: applicationMetadataId } },
        })),
      },
      logo: createApplicationDto.logo || null,
      description: createApplicationDto.description,
      targetPopulations: createApplicationDto.targetPopulations,
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
    },
    include: {
      labels: true,
      metadata: true,
      compliances: true,
    },
  };
};
