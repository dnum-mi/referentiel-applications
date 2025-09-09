import {
  Controller,
  Patch,
  Body,
  Param,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse, ApiForbiddenResponse } from "@nestjs/swagger";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserFilterDto } from "./dto/filters.dto";
import { RequiredAdminLevel } from "../common/decorators/admin.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { AdminLevel, UserEntity } from "./entities/user.entity";
import { User } from "src/common/decorators/user.decorator";

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
    description: "Liste des utilisateurs",
    type: UserEntity,
    isArray: true,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  async findAll(@Query() filters: UserFilterDto) {
    return this.userService.findAll(filters);
  }
}
