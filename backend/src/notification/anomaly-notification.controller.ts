import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
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
import { AnomalyNotificationService } from "./anomaly-notification.service";
import {
  CreateAnomalyNotificationDto,
  CreateAnomalyNotificationRequestDto,
} from "./dto/create-anomaly-notification.dto";
import { GetAnomalyNotificationDto } from "./dto/get-anomaly-notification.dto";
import { UpdateAnomalyNotificationDto } from "./dto/update-anomaly-notification.dto";
import { AnomalyFiltersDto } from "src/notification/dto/filters.dto";
import { User } from "src/common/decorators/user.decorator";
import { UserEntity } from "src/user/entities/user.entity";
import { AppAction } from "src/common/decorators/application.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";

/**
 * Contrôleur pour la gestion des notifications d'anomalies.
 * Il permet de créer, récupérer, mettre à jour et supprimer des notifications d'anomalies.
 */
@ApiTags("Notifications")
@Controller("anomaly-notifications")
export class AnomalyNotificationsController {
  constructor(protected service: AnomalyNotificationService) {}

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
    type: GetAnomalyNotificationDto,
    isArray: true,
  })
  findAll(
    @User() requestor: UserEntity,
    @Query() filters: AnomalyFiltersDto,
  ) {
    return this.service.findAll({
      requestor,
      notifierId: !filters.all ? requestor.keycloakId : undefined,
    });
  }
}

/**
 * Contrôleur pour la gestion des notifications d'anomalies.
 * Il permet de créer, récupérer, mettre à jour et supprimer des notifications d'anomalies.
 */
@ApiTags("ApplicationNotifications")
@ApiParam({ name: "applicationId", description: "ID de l'application", type: String })
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/anomaly-notifications")
export class ApplicationAnomalyNotificationsController {
  constructor(protected service: AnomalyNotificationService) {}

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
    type: GetAnomalyNotificationDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @User() requestor: UserEntity,
    @Body() requestData: CreateAnomalyNotificationRequestDto,
  ) {
    const data: CreateAnomalyNotificationDto = {
      ...requestData,
    };
    return this.service.create(data, requestor);
  }

  /**
   * Récupère toutes les notifications d'anomalie pour une application.
   *
   * @returns La liste de toutes les notifications d'anomalie d'une application.
   */
  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les notifications d'anomalies pour une application",
    description: "Renvoie la liste de toutes les notifications d'anomalies pour une application donnée.",
  })
  @ApiOkResponse({
    description: "Liste des notifications d'anomalies pour l'application",
    type: GetAnomalyNotificationDto,
    isArray: true,
  })
  findAll(
    @Query() filters: AnomalyFiltersDto,
    @User() requestor: UserEntity,
    @Param("applicationId") applicationId: string,
  ) {
    return this.service.findAll({
      applicationId,
      requestor,
      notifierId: !filters.all ? requestor.keycloakId : undefined,
    });
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
    type: GetAnomalyNotificationDto,
    description: "Notification trouvée avec succès",
  })
  findOne(
    @Param("id") id: string,
    @User() requestor: UserEntity,
  ) {
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
    type: GetAnomalyNotificationDto,
  })
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateAnomalyNotificationDto,
  ) {
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
