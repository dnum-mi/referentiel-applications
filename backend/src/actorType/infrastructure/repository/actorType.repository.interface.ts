import { ActorType, AppPermissions } from '@prisma/client';
import { CreateActorTypeDto } from 'src/actorType/dto/actorType.dto';

export interface IActorTypeRepository {
  create(actorType: CreateActorTypeDto): Promise<ActorType>;
  getPermsMatrix(): Promise<AppPermissions[]>;
  updatePermsMatrix(matrix: AppPermissions[]): Promise<AppPermissions[]>;
}
