import {
  BadRequestException,
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
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { Impersonator } from "src/common/decorators/impersonator.decorator";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserFilterDto } from "./dto/filters.dto";
import { MaiaOrganizationSuggestionDto } from "./dto/maia-organization-suggestion.dto";
import { SyncOrganizationsDto } from "./dto/sync-organizations.dto";
import { SyncOrganizationsResponseDto } from "./dto/sync-organizations-response.dto";
import { UpdateUserDto, UpdateUserPreferencesDto } from "./dto/update-user.dto";
import { ScopePermissionsErrorDto } from "./dto/user.error.dto";
import {
  Requestor,
  UserEntity,
  UserWithPermissions,
} from "./entities/user.entity";
import { UserPermissionsInterceptor } from "./user-permissions.interceptor";
import { UserService } from "./user.service";
import { RgaaComplianceErrorResponseDto } from "src/rgaa/dto/rgaa-compliance.dto";

@ApiTags("users")
@Controller("/users")
@UseInterceptors(UserPermissionsInterceptor)
@UseGuards(PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "Récupérer ses propres informations utilisateur" })
  @ApiOkResponse({
    type: UserWithPermissions,
    description: "Informations utilisateur trouvées",
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  findMe(@User() user: UserEntity) {
    return this.userService.getCurrentUser(user);
  }

  @Patch("me")
  @ApiOperation({
    summary: "Mettre à jour ses propres préférences utilisateur",
    description:
      "Permet à un utilisateur de modifier ses propres préférences (ex: notifications par email).",
  })
  @ApiOkResponse({
    description: "Préférences mises à jour avec succès",
    type: UserWithPermissions,
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  async updateMe(
    @User() user: UserEntity,
    @Body() UpdateUserPreferencesDto: UpdateUserPreferencesDto,
  ) {
    return this.userService.updateOwnPreferences(
      user.id,
      UpdateUserPreferencesDto,
    );
  }

  @Post("me/subscribe/:appId")
  @ApiOperation({ summary: "S'abonner aux notifications d'une application" })
  @ApiParam({ name: "appId", description: "ID de l'application à suivre" })
  @ApiOkResponse({
    description: "Abonnement pris en compte",
    type: UserWithPermissions,
  })
  @ApiCreatedResponse({
    description: "Abonnement pris en compte",
    type: UserWithPermissions,
  })
  async subscribe(@User() user: UserEntity, @Param("appId") appId: string) {
    return this.userService.subscribe(user.id, appId);
  }

  @Delete("me/subscribe/:appId")
  @ApiOperation({
    summary: "Se désabonner des notifications d'une application",
  })
  @ApiParam({
    name: "appId",
    description: "ID de l'application à ne plus suivre",
  })
  @ApiOkResponse({
    description: "Désabonnement pris en compte",
    type: UserWithPermissions,
  })
  async unsubscribe(@User() user: UserEntity, @Param("appId") appId: string) {
    return this.userService.unsubscribe(user.id, appId);
  }

  @Get("by-email/:email/sync-organization-from-maia")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Récupérer les informations MAIA d'un utilisateur par email",
    description:
      "Interroge MAIA pour récupérer l'organisation et les informations personnelles associées à cet email, sans modifier l'utilisateur en base.",
  })
  @ApiParam({ name: "email", description: "Email de l'utilisateur" })
  @ApiOkResponse({
    description: "Informations MAIA récupérées",
    type: MaiaOrganizationSuggestionDto,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  async syncOrganizationFromMaiaByEmail(@Param("email") email: string) {
    return this.userService.syncOrganizationFromMaiaByEmail(email);
  }

  @Post(":id/sync-organization-from-maia")
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Synchroniser l'organisation d'un utilisateur depuis MAIA",
    description:
      "Recherche l'utilisateur dans MAIA à partir de son email, crée l'organisation si nécessaire, puis l'associe à l'utilisateur ciblé.",
  })
  @ApiParam({ name: "id", description: "ID de l'utilisateur" })
  @ApiOkResponse({
    description: "Organisation synchronisée avec succès",
    type: UserWithPermissions,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  async syncOrganizationFromMaia(@Param("id") id: string) {
    return this.userService.syncOrganizationFromMaia(id);
  }

  @Post("sync-organizations-from-maia")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Synchroniser les organisations depuis MAIA (batch)",
    description:
      "Lance une synchronisation des organisations utilisateurs depuis MAIA en tâche de fond.",
  })
  @ApiBody({ type: SyncOrganizationsDto, required: false })
  @ApiOkResponse({
    description: "Batch MAIA lancé en tâche de fond",
    type: SyncOrganizationsResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  async syncOrganizationsFromMaia(@Body() body: SyncOrganizationsDto) {
    return this.userService.startSyncOrganizationsFromMaiaInBackground(body);
  }

  @Post("impersonate/stop")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Arrêter l'impersonation en cours",
    description:
      "Clôture la session d'impersonation active de l'administrateur. À appeler en conservant le header d'impersonation pour que le serveur identifie l'administrateur réel.",
  })
  @ApiNoContentResponse({ description: "Impersonation arrêtée" })
  async stopImpersonation(
    @Impersonator() impersonator: Requestor | undefined,
    @User() current: UserEntity,
  ): Promise<void> {
    if (!impersonator) {
      throw new BadRequestException("Aucune impersonation en cours");
    }
    return this.userService.stopImpersonation(impersonator.id, current.id);
  }

  @Post(":id/impersonate")
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Impersonner un utilisateur",
    description:
      "Démarre une session d'impersonation : l'administrateur se fait passer pour l'utilisateur cible. Renvoie les informations de l'utilisateur impersonné. Accès limité aux administrateurs.",
  })
  @ApiParam({ name: "id", description: "ID de l'utilisateur à impersonner" })
  @ApiOkResponse({
    description: "Session d'impersonation démarrée",
    type: UserWithPermissions,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  async impersonate(
    @Param("id") id: string,
    @User() requestor: Requestor,
  ): Promise<UserEntity> {
    return this.userService.startImpersonation(requestor, id);
  }

  @Patch(":id")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Mettre à jour les permissions d'un utilisateur",
    description:
      "Permet de modifier les permissions d'un utilisateur. Accès limité aux administrateurs.",
  })
  @ApiParam({ name: "id", description: "ID de l'utilisateur" })
  @ApiOkResponse({
    description: "Utilisateur mis à jour avec succès",
    type: UserWithPermissions,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  @ApiForbiddenResponse({
    description: "Une conformité RGAA existe déjà pour cette application",
    type: RgaaComplianceErrorResponseDto,
  })
  @ApiExtraModels(ScopePermissionsErrorDto)
  async update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() requestor: Requestor,
  ) {
    return this.userService.update(id, updateUserDto, requestor);
  }

  @Get()
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Lister tous les utilisateurs",
    description:
      "Récupère la liste de tous les utilisateurs avec leurs permissions. Supporte la recherche par email. Accès limité aux administrateurs.",
  })
  @ApiOkResponse({
    description: "Liste paginée des utilisateurs",
    type: PaginatedResponseDto.of(UserWithPermissions),
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  async findAll(
    @Query() filters: UserFilterDto,
    @User() requestor: Requestor,
  ): Promise<PaginatedResponseDto<UserEntity>> {
    return this.userService.findAll(filters, requestor);
  }
}
