import {
  Controller,
  Patch,
  Body,
  Param,
  Get,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Request as Req } from "express";
import { UserService } from "./user.service";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserFilterDto } from "./dto/filters.dto";
import { RequiredAdminLevel } from "../common/decorators/admin.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { AdminLevel } from "./entities/user.entity";

@ApiTags("users")
@Controller("/users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "Récupérer ses propres informations utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Informations utilisateur trouvées",
  })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
  async findMe(@Request() req: Req) {
    return req.user;
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
  @ApiResponse({
    status: 200,
    description: "Utilisateur mis à jour avec succès",
  })
  @ApiResponse({
    status: 403,
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiResponse({ status: 404, description: "Utilisateur non trouvé" })
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
  @ApiResponse({ status: 200, description: "Liste des utilisateurs" })
  @ApiResponse({
    status: 403,
    description: "Accès refusé - Privilège admin requis",
  })
  async findAll(@Query() filters: UserFilterDto) {
    return this.userService.findAll(filters);
  }
}
