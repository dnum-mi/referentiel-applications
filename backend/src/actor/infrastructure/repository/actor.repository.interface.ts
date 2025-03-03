import { Actor } from '@prisma/client';
import { CreateActorDto } from 'src/actor/dto/actor.dto';

export interface IActorRepository {
  create(actor: CreateActorDto): Promise<Actor>;
}
