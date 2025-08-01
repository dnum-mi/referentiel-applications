import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnomalyNotificationService } from "./anomaly-notification.service";
import {
  CreateAnomalyNotificationDto,
  CreateAnomalyNotificationRequestDto,
} from "./dto/create-anomaly-notification.dto";
import { GetAnomalyNotificationDto } from "./dto/get-anomaly-notification.dto";
import { UpdateAnomalyNotificationDto } from "./dto/update-anomaly-notification.dto";
import { FiltersDto } from "src/notification/dto/filters.dto";

/**
 * Contrôleur pour la gestion des notifications d'anomalies.
 * Il permet de créer, récupérer, mettre à jour et supprimer des notifications d'anomalies.
 */
@ApiTags("Notifications")
@Controller("anomaly-notifications")
export class ApplicationAnomalyNotificationsController {
  constructor(protected service: AnomalyNotificationService) {}

  /**
   * Crée une nouvelle notification d'anomalie.
   *
   * @param req La requête HTTP contenant les informations de l'utilisateur.
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
    @Request() req,
    @Body() requestData: CreateAnomalyNotificationRequestDto,
  ) {
    const data: CreateAnomalyNotificationDto = {
      ...requestData,
      notifierId: req.user.keycloakId,
    };
    return this.service.create(data);
  }

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
  findAll(@Query() filters: FiltersDto) {
    return this.service.findAll(filters);
  }

  /**
   * Récupère les notifications de signalement pour l'utilisateur actuellement connecté.
   *
   * @param req La requête HTTP contenant les informations de l'utilisateur.
   * @returns Une liste des notifications d'anomalies pour l'utilisateur.
   * @throws NotFoundException Si aucune notification n'est trouvée pour l'utilisateur.
   */
  @ApiOperation({
    summary:
      "Récupérer les notifications de signalements pour l'utilisateur actuellement connecté",
  })
  @ApiOkResponse({
    description: "Liste des notifications de signalements retournée.",
    type: GetAnomalyNotificationDto,
    isArray: true,
  })
  @Get("user-notifications")
  async findByCurrentUser(
    @Request() req,
  ): Promise<GetAnomalyNotificationDto[]> {
    return this.service.findAll({ notifierId: req.user.keycloakId });
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
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
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
  @ApiNoContentResponse({
    description: "Notification supprimée avec succès",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
