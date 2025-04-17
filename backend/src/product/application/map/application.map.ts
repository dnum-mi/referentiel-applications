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
      priorityRestart: createApplicationDto.priorityRestart || null,
      metadata: { connect: { id: applicationMetadataId } },
      owner: { connect: { keycloakId: ownerId } },
    },
    include: {
      labels: true,
      metadata: true,
    },
  };
};
