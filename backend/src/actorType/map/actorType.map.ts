import { CreateActorTypeDto } from '../dto/actorType.dto';

export const actorTypeMap = (CreateActorTypeDto: CreateActorTypeDto) => {
  return {
    data: {
      code: CreateActorTypeDto.code,
      label: CreateActorTypeDto.label,
      description: CreateActorTypeDto.description,
    },
  };
};
