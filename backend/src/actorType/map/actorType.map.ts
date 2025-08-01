import type { CreateActorTypeDto } from "../dto/actorType.dto";

export function actorTypeMap(CreateActorTypeDto: CreateActorTypeDto) {
  return {
    data: {
      code: CreateActorTypeDto.code,
      label: CreateActorTypeDto.label,
      description: CreateActorTypeDto.description,
    },
  };
}
