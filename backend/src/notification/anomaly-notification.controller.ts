import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  NotFoundException,
  BadRequestException,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnomalyNotificationService } from './anomaly-notification.service';
import {
  CreateAnomalyNotificationDto,
  CreateAnomalyNotificationRequestDto,
} from './dto/create-anomaly-notification.dto';
import { GetAnomalyNotificationDto } from './dto/get-anomaly-notification.dto';
import { UpdateAnomalyNotificationDto } from './dto/update-anomaly-notification.dto';
import { AnomalyNotificationStatus } from 'src/enum';
import { UserService } from '../user/user.service';
import { AuthUtils } from 'src/utils/helpers';

/**
 * Contrôleur pour la gestion des notifications d'anomalies.
 * Il permet de créer, récupérer, mettre à jour et supprimer des notifications d'anomalies.
 */
@ApiTags('Notifications')
@Controller('anomaly-notifications')
export class AnomalyNotificationController {
  constructor(
    private readonly anomalyNotificationService: AnomalyNotificationService,
    private readonly userService: UserService,
  ) {}

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
    summary: 'Demande de modification pour une fiche application',
  })
  async create(
    @Request() req,
    @Body() requestData: CreateAnomalyNotificationRequestDto,
  ) {
    const decodedToken = AuthUtils.getDecodedToken(req);
    if (typeof decodedToken.sub !== 'string') {
      throw new BadRequestException(
        'Token invalide : identifiant utilisateur manquant',
      );
    }
    const currentNotifierId = decodedToken.sub;

    const data: CreateAnomalyNotificationDto = {
      ...requestData,
      notifierId: currentNotifierId,
    };
    return this.anomalyNotificationService.create(req, data);
  }

  /**
   * Récupère toutes les notifications d'anomalie.
   *
   * @returns La liste de toutes les notifications d'anomalie.
   */
  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les notifications' })
  findAll() {
    return this.anomalyNotificationService.findAll();
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
  @ApiResponse({
    status: 200,
    description: 'Liste des notifications de signalements retournée.',
  })
  @ApiResponse({ status: 404, description: 'Aucune notification trouvée.' })
  @Get('user-notifications')
  async getAnomalyNotificationsByUser(
    @Request() req,
  ): Promise<GetAnomalyNotificationDto[]> {
    return await this.anomalyNotificationService.getAnomalyNotificationByNotifierId(
      req.user.keycloakId,
    );
  }

  /**
   * Récupère une notification d'anomalie spécifique en fonction de son ID.
   *
   * @param id L'identifiant de la notification.
   * @returns La notification d'anomalie correspondant à l'ID.
   * @throws NotFoundException Si aucune notification n'est trouvée pour cet ID.
   */
  @Get('/:applicationId')
  async getNotificationsByApplicationId(
    @Param('applicationId') applicationId: string,
  ): Promise<GetAnomalyNotificationDto[]> {
    try {
      return await this.anomalyNotificationService.getAnomalyNotificationByApplicationId(
        applicationId,
      );
    } catch (error) {
      throw new NotFoundException(
        "Aucune notification trouvée pour l'application avec l'ID spécifié.",
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une notification spécifique par ID' })
  findOne(@Param('id') id: string) {
    return this.anomalyNotificationService.findOne(id);
  }

  /**
   * Met à jour une notification d'anomalie existante.
   *
   * @param id L'identifiant de la notification à mettre à jour.
   * @param updateDto Les nouvelles données de la notification.
   * @returns La notification d'anomalie mise à jour.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une notification' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAnomalyNotificationDto,
  ) {
    return this.anomalyNotificationService.update(id, updateDto);
  }

  /**
   * Met à jour une notification d'anomalie existante.
   *
   * @param id L'identifiant de la notification à mettre à jour.
   * @param newStatus Les nouvelles données de la notification.
   * @returns La notification d'anomalie mise à jour.
   */
  @Patch('update/:id')
  @ApiOperation({ summary: "Mettre à jour le statut d'une notification" })
  updateStatus(
    @Param('id') id: string,
    @Body() newStatus: UpdateAnomalyNotificationDto,
  ) {
    return this.anomalyNotificationService.updateStatus(id, newStatus);
  }

  /**
   * Supprime une notification d'anomalie spécifique.
   *
   * @param id L'identifiant de la notification à supprimer.
   * @returns La notification d'anomalie supprimée.
   * @throws NotFoundException Si la notification n'est pas trouvée.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification' })
  remove(@Param('id') id: string) {
    return this.anomalyNotificationService.remove(id);
  }
}
