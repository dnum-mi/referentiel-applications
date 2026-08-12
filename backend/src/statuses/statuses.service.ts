import { Injectable } from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationStatus } from "./entities/status.entity";

/// Sous-ensemble minimal commun au client Prisma étendu et au client
/// transactionnel (`tx`) : les types générés des deux ne sont pas mutuellement
/// assignables à cause des extensions ($extends), d'où ce typage structurel.
export interface CurrentStatusClient {
  applicationStatus: {
    findFirst(args: {
      where: { applicationId: string };
      orderBy: { statusDate: { sort: "desc"; nulls: "last" } }[];
    }): Promise<{ id: string } | null>;
  };
  application: {
    update(args: {
      where: { id: string };
      data: { currentStatusId: string };
    }): Promise<unknown>;
  };
}

@Injectable()
export class StatusesService extends BaseService<ApplicationStatus> {
  constructor(prisma: PrismaService) {
    super(prisma.applicationStatus, prisma);
  }

  async find(filters: { applicationId: string }) {
    return this.prisma.applicationStatus.findMany({
      where: { applicationId: filters.applicationId },
      orderBy: [{ statusDate: { sort: "desc", nulls: "last" } }],
    });
  }

  // Seul point qui porte la règle « statut courant = plus récent par statusDate »
  // (#2250). `client` permet de l'appliquer au sein d'une transaction (création
  // d'application) sans perdre l'atomicité.
  async updateCurrentStatus(
    applicationId: string,
    client: CurrentStatusClient = this.prisma,
  ): Promise<void> {
    const latestStatus = await client.applicationStatus.findFirst({
      where: { applicationId },
      orderBy: [{ statusDate: { sort: "desc", nulls: "last" } }],
    });

    if (latestStatus) {
      await client.application.update({
        where: { id: applicationId },
        data: { currentStatusId: latestStatus.id },
      });
    }
  }
}
