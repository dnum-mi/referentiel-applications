import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { User } from "src/common/decorators/user.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { RequiredAdminLevel } from "../common/decorators/admin.decorator";
import { UserFilterDto } from "./dto/filters.dto";
import { UpdateUserDto, UpdateUserPreferencesDto } from "./dto/update-user.dto";
import { UsersPaginatedResponseDto } from "./dto/users.dto";
import { AdminLevel, Requestor, UserEntity } from "./entities/user.entity";
import { UserService } from "./user.service";

@ApiTags("users")
@Controller("/users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "Récupérer ses propres informations utilisateur" })
  @ApiOkResponse({
    type: UserEntity,
    description: "Informations utilisateur trouvées",
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  findMe(@User() user: UserEntity) {
    return this.userService.getCurrentUser(user);
  }

  @Patch("me")
  @ApiOperation({
    summary: "Mettre à jour ses propres préférences utilisateur",
    description: "Permet à un utilisateur de modifier ses propres préférences (ex: notifications par email).",
  })
  @ApiOkResponse({
    description: "Préférences mises à jour avec succès",
    type: UserEntity,
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  async updateMe(@User() user: UserEntity, @Body() UpdateUserPreferencesDto: UpdateUserPreferencesDto) {
    return this.userService.updateOwnPreferences(user.id, UpdateUserPreferencesDto);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: "Mettre à jour les permissions d'un utilisateur",
    description:
      "Permet de modifier les permissions d'un utilisateur. Accès limité aux administrateurs.",
  })
  @ApiParam({ name: "id", description: "ID Keycloak de l'utilisateur" })
  @ApiOkResponse({
    description: "Utilisateur mis à jour avec succès",
    type: UserEntity,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Utilisateur non trouvé" })
  async update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: "Lister tous les utilisateurs",
    description:
      "Récupère la liste de tous les utilisateurs avec leurs permissions. Supporte la recherche par email et ID Keycloak. Accès limité aux administrateurs.",
  })
  @ApiOkResponse({
    description: "Liste paginée des utilisateurs",
    type: UsersPaginatedResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  async findAll(
    @Query() filters: UserFilterDto,
    @User() requestor: Requestor,
  ) {
    return this.userService.findAll(filters, requestor);
  }
}
