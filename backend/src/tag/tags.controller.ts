import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { RequiredAdminLevel } from "src/common/decorators/admin.decorator";
import { AppAction } from "src/common/decorators/application.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { AdminLevel } from "src/user/entities/user.entity";
import {
  CreateTagDto,
  TagDto,
  TagFiltersDto,
  TagsPaginatedResponseDto,
  UpdateTagDto,
} from "./dto/tag.dto";
import { TagsService } from "./tags.service";

@ApiTags("Tags")
@UseGuards(ApplicationGuard)
@Controller("tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: "Créer un nouveau tag.",
    description: `
Ce endpoint permet de créer un tag.

Information requise : 
- **name** : nom unique du tag
    `,
  })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Tag créé avec succès",
    type: TagDto,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get(":id")
  @AppAction("readBase")
  @ApiOperation({ summary: "Rechercher un tag par id." })
  @ApiOkResponse({ description: "Tag trouvé avec succès", type: TagDto })
  @ApiNotFoundResponse({ description: "Tag non trouvé" })
  @ApiParam({ name: "id", description: "ID du tag à trouver" })
  findOne(@Param("id") id: string) {
    return this.tagsService.findOne(id);
  }

  @Get()
  @AppAction("readBase")
  @ApiOperation({
    summary: "Rechercher des tags.",
    description: `
  Cette route permet de rechercher selon les paramètres fournis :
  
  - Retourne une liste paginée ou non de tags.
  - Filtrage possible par nom.
  - Tri possible par :
    - \`popularité\` (défaut)
    - \`name\`
    - \`createdAt\`
  - Ordre : \`asc\` ou \`desc\`.
  `,
  })
  @ApiOkResponse({
    description: "Liste des tags trouvés",
    type: TagsPaginatedResponseDto,
  })
  findAll(@Query() filters: TagFiltersDto) {
    return this.tagsService.findAll(filters);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({ summary: "Modifier un tag." })
  @ApiOkResponse({ description: "Tag mis à jour avec succès", type: TagDto })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Tag non trouvé" })
  @ApiParam({ name: "id", description: "ID du tag à modifier" })
  update(@Param("id") id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({ summary: "Supprimer un tag." })
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Tag supprimé avec succès" })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Tag non trouvé" })
  @ApiParam({ name: "id", description: "ID du tag à supprimer" })
  delete(@Param("id") id: string) {
    return this.tagsService.delete(id);
  }
}
