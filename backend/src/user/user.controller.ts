import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserFilterDto } from "./dto/filters.dto";
import { UpdateUserDto, UpdateUserPreferencesDto } from "./dto/update-user.dto";
import {
  Requestor,
  UserEntity,
  UserWithPermissions,
} from "./entities/user.entity";
import { UserPermissionsInterceptor } from "./user-permissions.interceptor";
import { UserService } from "./user.service";

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
  async update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
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
