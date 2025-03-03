import { CreateActorDto } from '../dto/actor.dto';

export const actorMap = (createActorDto: CreateActorDto) => {
  return {
    data: {
      firstname: createActorDto.firstname,
      lastname: createActorDto.lastname,
      role: createActorDto.role,
      type: createActorDto.type,
      email: createActorDto.email,
      organization: createActorDto.organizationId
        ? { connect: { id: createActorDto.organizationId } }
        : undefined,
      application: createActorDto.applicationId
        ? { connect: { id: createActorDto.applicationId } }
        : undefined,
    },
  };
};
