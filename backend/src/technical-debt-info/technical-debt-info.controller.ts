import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AppAction } from "src/common/decorators/application.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import { CreateTechnicalDebtInfoDto, TechnicalDebtInfoDto } from "./dto/create-technical-debt-info.dto";
import { UpdateTechnicalDebtInfoDto } from "./dto/update-technical-debt-info.dto";
import { TechnicalDebtInfoService } from "./technical-debt-info.service";

@ApiTags("Technical Debt Info")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/technical-debt-info")
export class ApplicationTechnicalDebtInfoController {
  constructor(
    private readonly technicalDebtInfoService: TechnicalDebtInfoService,
  ) {}

  @Post()
  @AppAction("writeBase")
  @ApiOperation({ summary: "Create technical debt info for an application" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Technical debt info created successfully",
    type: TechnicalDebtInfoDto,
  })
  @ApiConflictResponse({
    description: "Technical debt info already exists for this application",
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async create(
    @UserId() userId: string,
    @Body() createDto: CreateTechnicalDebtInfoDto,
    @Param("applicationId") applicationId: string,
  ) {
    const created = await this.technicalDebtInfoService.create({
      ...createDto,
      application: {
        connect: {
          id: applicationId,
        },
      },
      metadatas: {
        create: {
          applicationId,
          createdById: userId,
          description: "Ajout des informations de dette technique",
        },
      },
    });
    return created;
  }

  @Get()
  @AppAction("readBase")
  @ApiOperation({ summary: "Retrieve the technical debt info for an application" })
  @ApiOkResponse({
    description: "Technical debt info found successfully",
    type: TechnicalDebtInfoDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async findOne(@Param("applicationId") applicationId: string) {
    const result = await this.technicalDebtInfoService.findByApplicationId(applicationId);
    if (!result) {
      throw new NotFoundException("No technical debt info found for this application");
    }
    return result;
  }

  @Patch()
  @AppAction("writeBase")
  @ApiOperation({ summary: "Update the technical debt info for an application" })
  @ApiOkResponse({
    description: "Technical debt info updated successfully",
    type: TechnicalDebtInfoDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async update(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Body() updateDto: UpdateTechnicalDebtInfoDto,
  ) {
    const existing = await this.technicalDebtInfoService.findByApplicationId(applicationId);
    if (!existing) {
      throw new NotFoundException("No technical debt info found for this application");
    }
    const result = await this.technicalDebtInfoService.updateWithMetadata({
      id: existing.id,
      data: updateDto,
      userId,
      applicationId,
      gender: "de la dette technique",
      entityName: "technicalDebtInfoId",
      metadataFields: {
        technicalMaturity: "maturité technique",
        businessMaturity: "maturité métier",
        costMaturity: "maturité des coûts",
      },
      getName: () => "",
      triggerQualityUpdate: false,
    });
    return result;
  }
}
