import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import { CompliancesService } from "./compliances.service";
import {
  ComplianceDto,
  CreateComplianceDto,
} from "./dto/create-compliance.dto";
import { UpdateComplianceDto } from "./dto/update-compliance.dto";
import { detectCompliances } from "./utils/compliance.utils";
import { COMPLIANCE_METADATA_FIELDS } from "./constants/compliance-metadata.constants";

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
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/compliances")
export class ApplicationCompliancesController {
  constructor(private readonly compliancesService: CompliancesService) {}

  @Post()
  @RequiredPermissions([Permission.ComplianceWrite])
  @ApiOperation({ summary: "Create a new compliance for an application" })
  @HttpCode(200)
  @ApiOkResponse({
    description: "Compliance created or updated successfully",
    type: ComplianceDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async create(
    @UserId() userId: string,
    @Body() createComplianceDto: CreateComplianceDto,
    @Param("applicationId") applicationId: string,
  ) {
    const sections = detectCompliances(Object.keys(createComplianceDto));
    const sectionSuffix = sections.length ? ` (${sections.join(", ")})` : "";
    return await this.compliancesService.createOrUpdateByApplicationId(
      applicationId,
      createComplianceDto,
      {
        applicationId,
        metadata: {
          userId,
          gender: "de la conformité",
          getColumn: () => sectionSuffix,
          entity: "complianceId",
        },
      },
    );
  }

  @Get()
  @RequiredPermissions([Permission.ComplianceRead])
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
  @RequiredPermissions([Permission.ComplianceWrite])
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
    const sections = detectCompliances(Object.keys(updateComplianceDto));
    const sectionSuffix = sections.length ? ` (${sections.join(", ")})` : "";

    return this.compliancesService.createOrUpdateByApplicationId(
      applicationId,
      updateComplianceDto,
      {
        applicationId,
        metadata: {
          userId,
          gender: "de la conformité",
          entity: "complianceId",
          getColumn: () => sectionSuffix,
          fields: COMPLIANCE_METADATA_FIELDS,
        },
      },
    );
  }

  @Post("ecoindex/scan")
  @RequiredPermissions([Permission.ComplianceWrite])
  @ApiOperation({
    summary: "Calculer et enregistrer le score EcoIndex pour cette application",
  })
  @HttpCode(200)
  @ApiOkResponse({
    description: "Score EcoIndex calculé et enregistré avec succès",
    type: ComplianceDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async scanEcoIndex(@Param("applicationId") applicationId: string) {
    return this.compliancesService.calculateAndStoreLatestEcoIndex(
      applicationId,
    );
  }
}
