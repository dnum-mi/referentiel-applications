import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Actor, Permission } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto/paginated-response.dto";
import { UserId } from "../common/decorators/user-id.decorator";
import { ActorService } from "./actor.service";
import {
  ActorDto,
  ActorFiltersDto,
  AdminActorFiltersDto,
  ApplicationRefDto,
  BulkResultDto,
  BulkActorByEmailDto,
  BulkUpdateActorByEmailDto,
  CreateActorDto,
  UpdateActorDto,
} from "./dto/actor.dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { FeatureFlag } from "src/common/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/feature-flag/feature-flag.guard";
import { FeatureFlagKey } from "src/feature-flag/feature-flag.keys";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";

@ApiTags("Actors")
@FeatureFlag(FeatureFlagKey.ACTORS)
@UseGuards(PermissionGuard, FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
@Controller("actors")
export class ActorController {
  constructor(private readonly actorService: ActorService) {}

  @Get()
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Récupérer tous les acteurs (admin)",
    description:
      "Liste paginée de tous les acteurs avec recherche par email, prénom, nom ou application.",
  })
  @ApiOkResponse({
    description: "Liste paginée des acteurs",
    type: PaginatedResponseDto.of(ActorDto),
  })
  public async findAll(@Query() filters: AdminActorFiltersDto) {
    return this.actorService.findAllGlobal(filters);
  }

  @Get("applications-by-email")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Récupérer les applications d'un acteur par email",
    description:
      "Retourne la liste des applications dans lesquelles un acteur avec cet email est présent.",
  })
  @ApiOkResponse({
    description: "Liste des applications",
    type: [ApplicationRefDto],
  })
  public async findApplicationsByEmail(@Query("email") email: string) {
    return this.actorService.findApplicationsByEmail(email);
  }

  @Delete("by-email")
  @RequiredPermissions([Permission.AdminPanelManage])
  @HttpCode(200)
  @ApiOperation({
    summary: "Supprimer des acteurs par email (admin)",
    description:
      "Supprime les acteurs partageant le même email dans les applications sélectionnées (ou toutes si non spécifié).",
  })
  @ApiOkResponse({
    description: "Nombre d'acteurs supprimés",
    type: BulkResultDto,
  })
  @ApiBody({ type: BulkActorByEmailDto })
  public async deleteAllByEmail(
    @UserId() userId: string,
    @Body() body: BulkActorByEmailDto,
  ) {
    Logger.log({
      message: "Suppression d'acteurs par email (admin)",
      email: body.email,
      applicationIds: body.applicationIds,
      action: "bulk-delete",
    });
    return this.actorService.deleteAllByEmail(
      body.email,
      userId,
      body.applicationIds,
    );
  }

  @Patch("by-email")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Modifier des acteurs par email (admin)",
    description:
      "Met à jour les acteurs partageant le même email dans les applications sélectionnées (ou toutes si non spécifié).",
  })
  @ApiOkResponse({
    description: "Nombre d'acteurs mis à jour",
    type: BulkResultDto,
  })
  @ApiBody({ type: BulkUpdateActorByEmailDto })
  public async updateAllByEmail(
    @UserId() userId: string,
    @Body() body: BulkUpdateActorByEmailDto,
  ) {
    const { targetEmail, applicationIds, ...updateData } = body;
    Logger.log({
      message: "Modification d'acteurs par email (admin)",
      email: targetEmail,
      applicationIds,
      action: "bulk-update",
    });
    return this.actorService.updateAllByEmail(
      targetEmail,
      updateData,
      userId,
      applicationIds,
    );
  }

  @Get("count")
  @ApiOperation({
    summary: "Récupérer le nombre total d'acteurs (toutes applications)",
  })
  @ApiOkResponse({
    description: "Nombre total d'acteurs",
    type: Number,
  })
  public async countAllActors(): Promise<number> {
    return this.actorService.count();
  }

  @Patch(":id")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({ summary: "Mettre à jour un acteur (admin)" })
  @ApiOkResponse({
    description: "Acteur mis à jour avec succès",
    type: ActorDto,
  })
  @ApiParam({ name: "id", description: "ID de l'acteur" })
  public async updateActor(
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() actorToUpdate: UpdateActorDto,
  ) {
    Logger.log({
      message: "Modification globale de l'acteur (admin)",
      actorToUpdate,
      action: "patch",
    });
    return this.actorService.updateGlobal(id, actorToUpdate, userId);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.AdminPanelManage])
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer un acteur (admin)" })
  @ApiNoContentResponse({ description: "Acteur supprimé avec succès" })
  @ApiParam({ name: "id", description: "ID de l'acteur" })
  public async deleteActor(@UserId() userId: string, @Param("id") id: string) {
    Logger.log({
      message: "Suppression globale de l'acteur (admin)",
      actorId: id,
      action: "delete",
    });
    return this.actorService.deleteGlobal(id, userId);
  }

  @Post("sync-maia")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Synchroniser les acteurs depuis MAIA (batch)",
    description:
      "Pour chaque acteur avec un email, récupère l'organisation, le prénom et le nom depuis MAIA et met à jour l'acteur. La tâche est lancée en arrière-plan.",
  })
  @ApiOkResponse({
    description: "Batch MAIA lancé en tâche de fond",
    type: String,
  })
  public syncFromMaia() {
    return this.actorService.startSyncActorsFromMaiaInBackground();
  }
}

@ApiTags("Actors")
@FeatureFlag(FeatureFlagKey.ACTORS)
@UseGuards(PermissionGuard, FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
@ApiParam({
  name: "applicationId",
  description: "ID de l'application",
  type: String,
})
@Controller("applications/:applicationId/actors")
export class ApplicationActorsController {
  constructor(private readonly actorService: ActorService) {}

  @Post()
  @ApiBody({ type: CreateActorDto })
  @RequiredPermissions([Permission.ActorWrite])
  @ApiOperation({
    summary: "Créer un nouvel acteur",
    description: `
Ce endpoint permet de créer un acteur complet.

Informations requises : 
- **email** : Email de l'acteur
- **firstname** : Prénom de l'acteur
- **lastname** : Nom de l'acteur
- **actorTypeId** : ID du type d'acteur lié à l'acteur 
- **organizationId** : ID de l'organisation liée à l'acteur
- **applicationId** : ID de l'application liée à l'acteur
    `,
  })
  @ApiCreatedResponse({
    description: "Acteur créé avec succès",
    type: ActorDto,
  })
  public create(
    @Param("applicationId") applicationId: string,
    @Body() createActorDto: CreateActorDto,
    @UserId() userId: string,
  ) {
    Logger.log({
      message: "Début de la création de l'acteur",
      userId,
      action: "create",
    });
    return this.actorService.create(createActorDto, applicationId, userId);
  }

  @Get(":id")
  @RequiredPermissions([Permission.ActorRead])
  @ApiOperation({ summary: "Récupérer un acteur par ID" })
  @ApiOkResponse({
    description: "Acteur trouvé avec succès",
    type: ActorDto,
  })
  @ApiParam({
    name: "id",
    description: "ID de l'acteur",
  })
  public async findOne(@Param("id") id: string): Promise<Actor> {
    return this.actorService.findOne(id);
  }

  @Get()
  @RequiredPermissions([Permission.ActorRead])
  @ApiOperation({ summary: "Récupérer tous les acteurs" })
  @ApiOkResponse({
    description: "Liste des acteurs trouvés",
    type: PaginatedResponseDto.of(ActorDto),
  })
  async findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: ActorFiltersDto,
  ) {
    return this.actorService.findAll({ ...filters, applicationId });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.ActorWrite])
  @ApiOperation({ summary: "Mettre à jour un acteur" })
  @ApiOkResponse({
    description: "Acteur mis à jour avec succès",
    type: ActorDto,
  })
  @ApiParam({
    name: "id",
    description: "ID de l'acteur",
  })
  public async updated(
    @UserId() userId: string,
    @Param("id") id: string,
    @Param("applicationId") applicationId: string,
    @Body() actorToUpdate: UpdateActorDto,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la modification de l'acteur",
      actorToUpdate,
      action: "patch",
    });

    return this.actorService.update(id, actorToUpdate, applicationId, userId);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.ActorWrite])
  @ApiOperation({ summary: "Supprimer un acteur" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Acteur supprimé avec succès",
  })
  @ApiParam({
    name: "id",
    description: "ID de l'acteur",
  })
  public async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la suppression de l'acteur",
      actorId: id,
      action: "delete",
    });

    return this.actorService.delete(id, applicationId, userId);
  }
}
