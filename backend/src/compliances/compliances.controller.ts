import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  NotFoundException,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiCreatedResponse, ApiOkResponse } from "@nestjs/swagger";
import { CompliancesService } from "./compliances.service";
import { ComplianceDto, CreateComplianceDto } from "./dto/create-compliance.dto";
import { UpdateComplianceDto } from "./dto/update-compliance.dto";
import { UserId } from "../common/decorators/user-id.decorator";
import { ApplicationService } from "src/product/application.service";
import { AppAction } from "src/common/decorators/application.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";

@ApiTags("Compliances")
@Controller("compliances")
export class ComplianceController {
  constructor(private readonly complianceService: CompliancesService) {}

  @Get("count")
  @ApiOperation({
    summary: "Récupérer le nombre total de conformités (toutes applications)",
  })
  @ApiOkResponse({
    description: "Nombre total de conformités",
    type: Number,
  })
  public async countAllCompliances(): Promise<number> {
    return this.complianceService.countAll();
  }
}

@ApiTags("Compliances")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/compliances")
export class ApplicationCompliancesController {
  constructor(
    private readonly compliancesService: CompliancesService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Post()
  @AppAction("writeCompliances")
  @ApiOperation({ summary: "Create a new compliance for an application" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Compliance created successfully",
    type: ComplianceDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async create(
    @UserId() userId: string,
    @Body() createComplianceDto: CreateComplianceDto,
    @Param("applicationId") applicationId: string,
  ) {
    const createdCompliance = await this.compliancesService.create({
      ...createComplianceDto,
      application: {
        connect: {
          id: applicationId,
        },
      },
      metadatas: {
        create: {
          applicationId,
          createdById: userId,
          description: "Ajout de la conformité",
        },
      },
    });
    await this.applicationService.updateApplicationQuality(applicationId);
    return createdCompliance;
  }

  @Get()
  @AppAction("readCompliances")
  @ApiOperation({ summary: "Retrieve the compliance for an application" })
  @ApiOkResponse({
    description: "Compliance found successfully",
    type: ComplianceDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async findOne(@Param("applicationId") applicationId: string) {
    return this.compliancesService.findByApplicationId(applicationId);
  }

  @Patch()
  @AppAction("writeCompliances")
  @ApiOperation({ summary: "Update the compliance for an application" })
  @ApiOkResponse({
    description: "Compliance updated successfully",
    type: ComplianceDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async update(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Body() updateComplianceDto: UpdateComplianceDto,
  ) {
    // Find the existing compliance for this application
    const compliance
      = await this.compliancesService.findByApplicationId(applicationId);
    if (!compliance) {
      throw new NotFoundException("No compliance found for this application");
    }

    const result = await this.compliancesService.updateWithMetadata({
      id: compliance.id,
      data: updateComplianceDto,
      userId,
      applicationId,
      gender: "de la conformité",
      entityName: "complianceId",
      metadataFields: {
        // DIMA fields
        dima_duration_hours: "durée DIMA (heures)",
        dima_is_hno: "HNO DIMA",
        dima_business_impact: "impact métier DIMA",
        dima_recovery_plan: "plan de reprise DIMA",
        dima_recovery_solutions: "solutions de reprise DIMA",
        dima_last_test_date: "date dernier test DIMA",
        dima_test_result: "résultat test DIMA",
        dima_recovery_manager: "responsable reprise DIMA",
        // PDMA fields
        pdma_duration_hours: "durée PDMA (heures)",
        pdma_data_types: "types de données PDMA",
        pdma_backup_frequency: "fréquence sauvegarde PDMA",
        pdma_backup_method: "méthode sauvegarde PDMA",
        pdma_backup_storage: "stockage sauvegarde PDMA",
        pdma_last_test_date: "date dernier test PDMA",
        pdma_test_result: "résultat test PDMA",
        pdma_restoration_manager: "responsable restauration PDMA",
        // Homologation fields
        homologation_date_end: "date fin homologation",
        homologation_rssi_id: "RSSI homologation",
        // RGAA fields
        rgaa_audit_date: "date audit RGAA",
        rgaa_service_url: "URL service RGAA",
        rgaa_accessibility_url: "URL accessibilité RGAA",
        rgaa_score_percentage: "score RGAA (%)",
        // DSFR fields
        dsfr_implemented: "DSFR implémenté",
        dsfr_version: "version DSFR",
        // RGPD fields
        rgpd_has_aipd: "AIPD RGPD",
        rgpd_dpo_name: "nom DPO RGPD",
      },
      getName: () => "Conformité",
      triggerQualityUpdate: true,
    });

    await this.applicationService.updateApplicationQuality(applicationId);
    return result;
  }
}
