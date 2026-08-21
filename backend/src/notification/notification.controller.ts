import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { PaginatedResponseDto } from "src/common/dto";
import { User } from "src/common/decorators/user.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { EmailLogDto } from "src/email/dto/email-log.dto";
import { UserEntity } from "src/user/entities/user.entity";
import { DeleteNotificationsDto } from "./dto/delete-notifications.dto";
import { NotificationFiltersDto } from "./dto/notification-filters.dto";
import { NotificationDto } from "./dto/notification.dto";
import { UnreadCountDto } from "./dto/unread-count.dto";
import { NotificationService } from "./notification.service";

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(PermissionGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: "Lister ses notifications",
    description:
      "Renvoie la liste paginée des notifications in-app de l'utilisateur courant, les plus récentes en premier.",
  })
  @ApiOkResponse({
    description: "Liste paginée des notifications",
    type: PaginatedResponseDto.of(NotificationDto),
  })
  findAll(@User() user: UserEntity, @Query() filters: NotificationFiltersDto) {
    return this.service.findAllForUser(user.id, filters);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Compter ses notifications non lues" })
  @ApiOkResponse({
    description: "Nombre de notifications non lues",
    type: UnreadCountDto,
  })
  countUnread(@User() user: UserEntity) {
    return this.service.countUnread(user.id);
  }

  @Get(":id/email")
  @ApiOperation({
    summary: "Voir l'e-mail associé à une notification",
    description:
      "Renvoie l'e-mail effectivement envoyé pour le même événement que cette notification, à afficher au clic plutôt que de rediriger.",
  })
  @ApiParam({ name: "id", description: "ID de la notification" })
  @ApiOkResponse({
    description: "E-mail associé à la notification",
    type: EmailLogDto,
  })
  @ApiNotFoundResponse({
    description: "Notification non trouvée ou sans e-mail associé",
  })
  findEmail(@User() user: UserEntity, @Param("id") id: string) {
    return this.service.findEmailForNotification(user.id, id);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Marquer une notification comme lue" })
  @ApiParam({ name: "id", description: "ID de la notification" })
  @ApiNoContentResponse({ description: "Notification marquée comme lue" })
  @ApiNotFoundResponse({ description: "Notification non trouvée" })
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(@User() user: UserEntity, @Param("id") id: string) {
    return this.service.markAsRead(user.id, id);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Marquer toutes ses notifications comme lues" })
  @ApiNoContentResponse({ description: "Notifications marquées comme lues" })
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(@User() user: UserEntity) {
    return this.service.markAllAsRead(user.id);
  }

  @Delete("bulk")
  @ApiOperation({ summary: "Supprimer plusieurs notifications" })
  @ApiNoContentResponse({ description: "Notifications supprimées" })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMany(@User() user: UserEntity, @Body() body: DeleteNotificationsDto) {
    return this.service.deleteMany(user.id, body.ids);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Supprimer une notification" })
  @ApiParam({ name: "id", description: "ID de la notification" })
  @ApiNoContentResponse({ description: "Notification supprimée" })
  @ApiNotFoundResponse({ description: "Notification non trouvée" })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@User() user: UserEntity, @Param("id") id: string) {
    return this.service.delete(user.id, id);
  }
}
