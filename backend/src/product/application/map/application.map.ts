import { CreateApplicationDto } from '../dto/create-application.dto';

export const applicationMap = (
  createApplicationDto: CreateApplicationDto,
  ownerId,
) => {
  return {
    data: {
      label: createApplicationDto.label,
      shortName: createApplicationDto.shortName || null,
      logo: createApplicationDto.logo || null,
      description: createApplicationDto.description,
      targetPopulations: createApplicationDto.targetPopulations,
      purposes: createApplicationDto.purposes,
      tags: createApplicationDto.tags,
      priorityRestart: createApplicationDto.priorityRestart || null,
      owner: { connect: { keycloakId: ownerId } },
    },
  };
};
