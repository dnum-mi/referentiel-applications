import { Injectable, NotFoundException } from "@nestjs/common";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/applications/application.service";
import { BaseService } from "../common/base.service";
import { Compliance } from "./entities/compliance.entity";
import { ServiceOptions } from "src/common/utils/types";
import { CreateComplianceDto } from "./dto/create-compliance.dto";
import { UpdateComplianceDto } from "./dto/update-compliance.dto";
import { calculateEcoIndexMetricsFromUrl } from "./utils/ecoindex.utils";

@Injectable()
export class CompliancesService extends BaseService<Compliance> {
  constructor(
    prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.compliance, prisma, metadataService, applicationService);
  }

  async findByApplicationId(applicationId: string): Promise<Compliance | null> {
    return this.model.findFirst({ where: { applicationId } });
  }

  async createOrUpdateByApplicationId(
    applicationId: string,
    data: CreateComplianceDto | UpdateComplianceDto,
    options?: ServiceOptions<Compliance>,
  ): Promise<Compliance> {
    const applicationExists = await this.hasApplication(applicationId);

    if (!applicationExists) {
      throw new NotFoundException("No application found for this ID");
    }

    const existing = await this.findByApplicationId(applicationId);
    if (existing) {
      return await this.updateConformites(existing, data, options);
    }

    return super.create(
      {
        ...data,
        applicationId,
      },
      options,
    );
  }

  private async hasApplication(applicationId: string): Promise<boolean> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    return Boolean(application);
  }

  updateConformites(
    existing: Compliance,
    data: CreateComplianceDto | UpdateComplianceDto,
    options?: ServiceOptions<Compliance>,
  ): Promise<Compliance> {
    const hasUpdatedUrl =
      !!existing.eco_index_target_url &&
      existing.eco_index_target_url !== data.eco_index_target_url;
    if (hasUpdatedUrl) {
      // if we update a new url, we need to reset eco-index score
      return this.resetEcoIndexScore(
        existing.id,
        data.eco_index_target_url,
        options,
      );
    }
    return this.update(existing.id, data, options);
  }

  async resetEcoIndexScore(
    complianceId: Compliance["id"],
    targetUrl: Compliance["eco_index_target_url"],
    options?: ServiceOptions<Compliance>,
  ) {
    // if we update a new url, we need to reset eco-index score
    const resetEcoIndexScores = {
      eco_index_score: null,
      eco_index_ges: null,
      eco_index_water: null,
      eco_index_last_calculated_at: null,
      eco_index_target_url: targetUrl,
    };
    return this.update(complianceId, resetEcoIndexScores, options);
  }

  async calculateAndStoreLatestEcoIndex(
    applicationId: string,
  ): Promise<Compliance> {
    const complianceRecord = await this.findByApplicationId(applicationId);
    const targetUrl = complianceRecord?.eco_index_target_url;

    if (!targetUrl?.startsWith("http")) {
      throw new NotFoundException(
        "Aucune URL cible EcoIndex valide trouvée. Veuillez renseigner eco_index_target_url dans la conformité.",
      );
    }

    const { score, ges, water, calculatedAt } =
      await calculateEcoIndexMetricsFromUrl(targetUrl);

    const data = {
      eco_index_score: score,
      eco_index_ges: ges,
      eco_index_water: water,
      eco_index_last_calculated_at: calculatedAt,
    };
    return this.prisma.compliance.upsert({
      where: { applicationId },
      create: {
        applicationId,
        ...data,
      },
      update: {
        ...data,
      },
    }) as unknown as Compliance;
  }
}
