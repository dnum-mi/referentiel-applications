import { CreateActorDto } from '../dto/actor.dto';

export const actorMap = (createActorDto: CreateActorDto) => {
  return {
    data: {
      ...createActorDto,
      organization: createActorDto.organizationId
        ? { connect: { id: createActorDto.organizationId } }
        : undefined,
      application: createActorDto.applicationId
        ? { connect: { id: createActorDto.applicationId } }
        : undefined,
      actorType: createActorDto.actorTypeId
        ? { connect: { id: createActorDto.actorTypeId } }
        : undefined,
    },
  };
};
