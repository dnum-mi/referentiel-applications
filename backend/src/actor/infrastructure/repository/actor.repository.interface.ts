import type { Actor } from "@prisma/client";
import type { CreateActorDto } from "src/actor/dto/actor.dto";

export interface IActorRepository {
  create: (actor: CreateActorDto, requestorId: string) => Promise<Actor>
}
