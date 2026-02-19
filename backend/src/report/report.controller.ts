import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { RequiredAdminLevel } from "src/common/decorators/admin.decorator";
import { AppAction } from "src/common/decorators/application.decorator";
import { RequiredUserCapability } from "src/common/decorators/user-capability.decorator";
import { User } from "src/common/decorators/user.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { UserCapabilityGuard } from "src/common/guards/user-capability.guard";
import { EmailService } from "src/email/email.service";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";
import { ReportsService } from "./report.service";
import { ReportFiltersDto } from "./dto/report-filters.dto";
import { ReportDto, ReportPaginatedResponseDto } from "./dto/report.dto";
import { CreateReportRequestDto } from "./dto/create-report.dto";
import { UpdateReportNotifyQuery } from "./dto/report-notify-query.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { UserNotificationService } from "./user-notification.service";

@ApiTags("Reports")
@Controller("reports")
@UseGuards(AdminGuard)
export class ReportsController {
  constructor(
    protected service: ReportsService,
    protected emailService: EmailService,
    protected notifyUserService: UserNotificationService,
  ) {}

  /**
   * Récupère tous les signalements.
   *
   * @returns La liste de tous les signalements.
   */
  @Get()
  @ApiOperation({
    summary: "Récupérer tous les signalements",
    description: "Renvoie la liste de tous les signalements.",
  })
  @ApiOkResponse({
    description: "Liste des signalements",
    type: ReportPaginatedResponseDto,
  })
  findAll(@Query() filters: ReportFiltersDto, @User() requestor: Requestor) {
    return this.service.findAll(requestor, filters);
  }

  /**
   * Crée un nouveau signalement.
   *
   * @param requestor La requête HTTP contenant les informations de l'utilisateur.
   * @param requestData Les données nécessaires pour créer un signalement.
   * @returns Le signalement créé.
   * @throws BadRequestException Si le token est invalide ou l'identifiant
   */
  @Post()
  @ApiOperation({
    summary: "Créer un signalement",
  })
  @ApiCreatedResponse({
    description: "Signalement créé avec succès",
    type: ReportDto,
  })
  @UseGuards(UserCapabilityGuard)
  @RequiredUserCapability("CreateGlobalReport")
  @HttpCode(HttpStatus.CREATED)
  async create(
    @User() requestor: Requestor,
    @Body() requestData: CreateReportRequestDto,
  ) {
    return this.service.create(
      requestData,
      requestor,
      requestData.applicationId,
    );
  }

  /**
   * Met à jour un signalement existant.
   *
   * @param id L'identifiant du signalement à mettre à jour.
   * @param updateDto Les nouvelles données du signalement.
   * @returns Le signalement mis à jour.
   */
  @Patch(":id")
  @RequiredAdminLevel(AdminLevel.WRITE)
  @ApiOperation({ summary: "Mettre à jour un signalement" })
  @AppAction("manageReports")
  @ApiOkResponse({
    description: "Signalement mis à jour avec succès",
    type: ReportDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateReportDto,
    @Query() query: UpdateReportNotifyQuery,
  ) {
    const report = await this.service.update(id, updateDto);
    await this.notifyUserService.notifyUserOnStatusChange(query.notify, report);
    return report;
  }
}

/**
 * Contrôleur pour la gestion des signalements d'une application.
 * Il permet de créer, récupérer, mettre à jour et supprimer des signalements.
 */
@ApiTags("ApplicationReports")
@ApiParam({
  name: "applicationId",
  description: "ID de l'application",
  type: String,
})
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/reports")
export class ApplicationReportsController {
  constructor(
    protected service: ReportsService,
    protected notifyUserService: UserNotificationService,
  ) {}

  /**
   * Crée un nouveau signalement.
   *
   * @param requestor La requête HTTP contenant les informations de l'utilisateur.
   * @param requestData Les données nécessaires pour créer un signalement.
   * @returns Le signalement créé.
   * @throws BadRequestException Si le token est invalide ou l'identifiant utilisateur est manquant.
   */
  @Post()
  @ApiOperation({
    summary: "Demande de modification pour une fiche application",
  })
  @ApiCreatedResponse({
    description: "Signalement créé avec succès",
    type: ReportDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @AppAction("postReports")
  @ApiParam({
    name: "applicationId",
    description: "ID de l'application",
    type: String,
    required: true,
  })
  async create(
    @User() requestor: Requestor,
    @Body() requestData: CreateReportRequestDto,
    @Param("applicationId") applicationId: string,
  ) {
    return this.service.create(requestData, requestor, applicationId);
  }

  /**
   * Récupère tous les signalements pour une application.
   *
   * @returns La liste de tous les signalements d'une application.
   */
  @Get()
  @ApiOperation({
    summary: "Récupérer tous les signalements pour une application",
    description:
      "Renvoie la liste paginée des signalements pour une application donnée.",
  })
  @ApiOkResponse({
    description: "Liste paginée des signalements pour l'application",
    type: ReportPaginatedResponseDto,
  })
  findAll(
    @Query() filters: ReportFiltersDto,
    @User() requestor: Requestor,
    @Param("applicationId") applicationId: string,
  ): Promise<ReportPaginatedResponseDto> {
    return this.service.findAll(requestor, filters, applicationId);
  }

  /**
   * Récupère un signalement spécifique en fonction de son ID.
   *
   * @param id L'identifiant du signalement.
   * @returns Le signalement correspondant à l'ID.
   */
  @Get(":id")
  @ApiOperation({ summary: "Récupérer un signalement spécifique par ID" })
  @ApiOkResponse({
    type: ReportDto,
    description: "Signalement trouvé avec succès",
  })
  findOne(@Param("id") id: string, @User() requestor: Requestor) {
    return this.service.findOne(id, requestor);
  }

  /**
   * Met à jour un signalement existant.
   *
   * @param id L'identifiant du signalement à mettre à jour.
   * @param updateDto Les nouvelles données du signalement.
   * @returns Le signalement mis à jour.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Mettre à jour un signalement" })
  @AppAction("manageReports")
  @ApiOkResponse({
    description: "Signalement mis à jour avec succès",
    type: ReportDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateReportDto,
    @Query() query: UpdateReportNotifyQuery,
  ) {
    const report = await this.service.update(id, updateDto);
    await this.notifyUserService.notifyUserOnStatusChange(query.notify, report);
    return report;
  }

  /**
   * Supprime un signalement spécifique.
   *
   * @param id L'identifiant du signalement à supprimer.
   * @returns Le signalement supprimé.
   * @throws NotFoundException Si le signalement n'est pas trouvé.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Supprimer un signalement" })
  @AppAction("manageReports")
  @ApiNoContentResponse({
    description: "Signalement supprimé avec succès",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
