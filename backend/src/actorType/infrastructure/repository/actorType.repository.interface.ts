import { ActorType } from '@prisma/client';
import { CreateActorTypeDto } from 'src/actorType/dto/actorType.dto';

export interface IActorTypeRepository {
  create(actorType: CreateActorTypeDto): Promise<ActorType>;
}
