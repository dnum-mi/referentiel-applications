import { Injectable } from "@nestjs/common";
import { ActorType, AppPermissions } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AppPermsDto } from "./dto/app-perms-matrix.dto";

@Injectable()
export class ActorTypeService extends BaseService<ActorType> {
  constructor(prisma: PrismaService) {
    super(prisma.actorType, prisma);
  }

  public async getPermsMatrix(): Promise<AppPermissions[]> {
    return this.prisma.appPermissions.findMany();
  }

  public async updatePermsMatrix(
    matrix: AppPermsDto[],
  ): Promise<AppPermissions[]> {
    for (const perm of matrix) {
      await this.prisma.appPermissions.update({
        where: { actorTypeId: perm.actorTypeId },
        data: perm as AppPermissions,
      });
    }
    return this.getPermsMatrix();
  }
}
