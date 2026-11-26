import { technicalDebtAccessWhere } from "src/common/utils/technical-debt-access.utils";
import type { Requestor } from "src/user/entities/user.entity";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ApplicationService } from "src/applications/application.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseService } from "../common/base.service";
import { TechnicalDebtInfo } from "./entities/technical-debt-info.entity";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";

@Injectable()
export class TechnicalDebtInfoService extends BaseService<
  TechnicalDebtInfo,
  PrismaService["technicalDebtInfo"]
> {
  constructor(
    prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(
      prisma.technicalDebtInfo,
      prisma,
      metadataService,
      applicationService,
    );
  }

  async findByApplicationId(
    applicationId: string,
    filters: Pick<PaginationDto, "page" | "pageSize">,
    requestor: Requestor,
  ): Promise<PaginatedResponseDto<TechnicalDebtInfo>> {
    const allowed = await this.prisma.application.findFirst({
      where: {
        AND: [{ id: applicationId }, technicalDebtAccessWhere(requestor)],
      },
      select: { id: true },
    });
    if (!allowed)
      throw new ForbiddenException("Données de dette IT hors périmètre.");
    return this.model.paginate({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
      ...filters,
    });
  }
}
