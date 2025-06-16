import { Controller, Patch, Body, Param, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('users')
@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID' })
  @ApiParam({ name: 'id', description: "ID Keycloak de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.userService.findUserByKeycloakId(id);
  }

  @Patch(':id')
  @Permissions('admin')
  @ApiOperation({
    summary: "Mettre à jour les permissions d'un utilisateur",
    description:
      "Permet de modifier les permissions d'un utilisateur. Accès limité aux administrateurs.",
  })
  @ApiParam({ name: 'id', description: "ID Keycloak de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour avec succès',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Privilège admin requis',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Get()
  @Permissions('admin')
  @ApiOperation({
    summary: 'Lister tous les utilisateurs',
    description:
      'Récupère la liste de tous les utilisateurs avec leurs permissions. Accès limité aux administrateurs.',
  })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Privilège admin requis',
  })
  async findAll() {
    return this.userService.findAll();
  }
}
