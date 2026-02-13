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
import { AnomalyNotificationsService } from "./anomaly-notification.service";
import { AnomalyFiltersDto } from "./dto/anomaly-filters.dto";
import {
  AnomalyNotificationDto,
  AnomalyNotificationPaginatedResponseDto,
} from "./dto/anomaly-notification.dto";
import { CreateAnomalyNotificationRequestDto } from "./dto/create-anomaly-notification.dto";
import { UpdateAnomalyNotifyQuery } from "./dto/notify-query.dto";
import { UpdateAnomalyNotificationDto } from "./dto/update-anomaly-notification.dto";
import { UserNotificationService } from "./user-notification.service";

@ApiTags("AnomalyNotifications")
@Controller("anomaly-notifications")
@UseGuards(AdminGuard)
export class AnomalyNotificationsController {
  constructor(
    protected service: AnomalyNotificationsService,
    protected emailService: EmailService,
    protected notifyUserService: UserNotificationService,
  ) {}

  /**
   * Récupère toutes les notifications d'anomalie.
   *
   * @returns La liste de toutes les notifications d'anomalie.
   */
  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les notifications d'anomalies",
    description: "Renvoie la liste de toutes les notifications d'anomalies.",
  })
  @ApiOkResponse({
    description: "Liste des notifications d'anomalies",
    type: AnomalyNotificationPaginatedResponseDto,
  })
  findAll(@Query() filters: AnomalyFiltersDto, @User() requestor: Requestor) {
    return this.service.findAll(requestor, filters);
  }

  /**
   * Crée une nouvelle notification d'anomalie.
   *
   * @param requestor La requête HTTP contenant les informations de l'utilisateur.
   * @param requestData Les données nécessaires pour créer une notification d'anomalie.
   * @returns La notification d'anomalie créée.
   * @throws BadRequestException Si le token est invalide ou l'identifiant
   */
  @Post()
  @ApiOperation({
    summary: "Rapporter une anomalie",
  })
  @ApiCreatedResponse({
    description: "Notification d'anomalie créée avec succès",
    type: AnomalyNotificationDto,
  })
  @UseGuards(UserCapabilityGuard)
  @RequiredUserCapability("CreateGlobalAnomalyNotification")
  @HttpCode(HttpStatus.CREATED)
  async create(
    @User() requestor: Requestor,
    @Body() requestData: CreateAnomalyNotificationRequestDto,
  ) {
    return this.service.create(
      requestData,
      requestor,
      requestData.applicationId,
    );
  }

  /**
   * Met à jour une notification d'anomalie existante.
   *
   * @param id L'identifiant de la notification à mettre à jour.
   * @param updateDto Les nouvelles données de la notification.
   * @returns La notification d'anomalie mise à jour.
   */
  @Patch(":id")
  @RequiredAdminLevel(AdminLevel.WRITE)
  @ApiOperation({ summary: "Mettre à jour une notification" })
  @AppAction("manageAnomalyNotifications")
  @ApiOkResponse({
    description: "Notification mise à jour avec succès",
    type: AnomalyNotificationDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateAnomalyNotificationDto,
    @Query() query: UpdateAnomalyNotifyQuery,
  ) {
    const anomalyNotification = await this.service.update(id, updateDto);
    await this.notifyUserService.notifyUserOnStatusChange(
      query.notify,
      anomalyNotification,
    );
    return anomalyNotification;
  }
}

/**
 * Contrôleur pour la gestion des notifications d'anomalies.
 * Il permet de créer, récupérer, mettre à jour et supprimer des notifications d'anomalies.
 */
@ApiTags("ApplicationNotifications")
@ApiParam({
  name: "applicationId",
  description: "ID de l'application",
  type: String,
})
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/anomaly-notifications")
export class ApplicationAnomalyNotificationsController {
  constructor(
    protected service: AnomalyNotificationsService,
    protected notifyUserService: UserNotificationService,
  ) {}

  /**
   * Crée une nouvelle notification d'anomalie.
   *
   * @param requestor La requête HTTP contenant les informations de l'utilisateur.
   * @param requestData Les données nécessaires pour créer une notification d'anomalie.
   * @returns La notification d'anomalie créée.
   * @throws BadRequestException Si le token est invalide ou l'identifiant utilisateur est manquant.
   */
  @Post()
  @ApiOperation({
    summary: "Demande de modification pour une fiche application",
  })
  @ApiCreatedResponse({
    description: "Notification d'anomalie créée avec succès",
    type: AnomalyNotificationDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @AppAction("postAnomalyNotifications")
  @ApiParam({
    name: "applicationId",
    description: "ID de l'application",
    type: String,
    required: true,
  })
  async create(
    @User() requestor: Requestor,
    @Body() requestData: CreateAnomalyNotificationRequestDto,
    @Param("applicationId") applicationId: string,
  ) {
    return this.service.create(requestData, requestor, applicationId);
  }

  /**
   * Récupère toutes les notifications d'anomalie pour une application.
   *
   * @returns La liste de toutes les notifications d'anomalie d'une application.
   */
  @Get()
  @ApiOperation({
    summary:
      "Récupérer toutes les notifications d'anomalies pour une application",
    description:
      "Renvoie la liste paginée des notifications d'anomalies pour une application donnée.",
  })
  @ApiOkResponse({
    description:
      "Liste paginée des notifications d'anomalies pour l'application",
    type: AnomalyNotificationPaginatedResponseDto,
  })
  findAll(
    @Query() filters: AnomalyFiltersDto,
    @User() requestor: Requestor,
    @Param("applicationId") applicationId: string,
  ): Promise<AnomalyNotificationPaginatedResponseDto> {
    return this.service.findAll(requestor, filters, applicationId);
  }

  /**
   * Récupère une notification d'anomalie spécifique en fonction de son ID.
   *
   * @param id L'identifiant de la notification.
   * @returns La notification d'anomalie correspondant à l'ID.
   */
  @Get(":id")
  @ApiOperation({ summary: "Récupérer une notification spécifique par ID" })
  @ApiOkResponse({
    type: AnomalyNotificationDto,
    description: "Notification trouvée avec succès",
  })
  findOne(@Param("id") id: string, @User() requestor: Requestor) {
    return this.service.findOne(id, requestor);
  }

  /**
   * Met à jour une notification d'anomalie existante.
   *
   * @param id L'identifiant de la notification à mettre à jour.
   * @param updateDto Les nouvelles données de la notification.
   * @returns La notification d'anomalie mise à jour.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Mettre à jour une notification" })
  @AppAction("manageAnomalyNotifications")
  @ApiOkResponse({
    description: "Notification mise à jour avec succès",
    type: AnomalyNotificationDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateAnomalyNotificationDto,
    @Query() query: UpdateAnomalyNotifyQuery,
  ) {
    const anomalyNotification = await this.service.update(id, updateDto);
    await this.notifyUserService.notifyUserOnStatusChange(
      query.notify,
      anomalyNotification,
    );
    return this.service.update(id, updateDto);
  }

  /**
   * Supprime une notification d'anomalie spécifique.
   *
   * @param id L'identifiant de la notification à supprimer.
   * @returns La notification d'anomalie supprimée.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Supprimer une notification" })
  @AppAction("manageAnomalyNotifications")
  @ApiNoContentResponse({
    description: "Notification supprimée avec succès",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
