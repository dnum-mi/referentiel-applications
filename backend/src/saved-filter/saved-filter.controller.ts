import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { User } from "src/common/decorators/user.decorator";
import { ApiErrorDto } from "src/common/dto/api-error.dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserEntity } from "src/user/entities/user.entity";
import { CreateSavedFilterDto } from "./dto/create-saved-filter.dto";
import { SavedFilterDto } from "./dto/saved-filter.dto";
import { RenameSavedFilterDto } from "./dto/rename-saved-filter.dto";
import { SavedFilterService } from "./saved-filter.service";

@ApiTags("SavedFilters")
@Controller("saved-filters")
@UseGuards(PermissionGuard)
export class SavedFilterController {
  constructor(private readonly service: SavedFilterService) {}

  @Get()
  @ApiOperation({
    summary: "Lister ses filtres sauvegardés",
    description:
      "Renvoie les filtres de recherche d'applications sauvegardés par l'utilisateur courant.",
  })
  @ApiOkResponse({
    description: "Liste des filtres sauvegardés",
    type: [SavedFilterDto],
  })
  findAll(@User() user: UserEntity) {
    return this.service.findAllForUser(user.id);
  }

  @Post()
  @ApiOperation({
    summary: "Sauvegarder un filtre",
    description:
      "Sauvegarde les filtres courants sous un nom. Si un filtre du même nom existe déjà pour l'utilisateur, il est remplacé.",
  })
  @ApiCreatedResponse({
    description: "Filtre sauvegardé",
    type: SavedFilterDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@User() user: UserEntity, @Body() body: CreateSavedFilterDto) {
    return this.service.upsert(user.id, body);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Renommer un filtre personnel sans modifier ses critères",
  })
  @ApiParam({ name: "id", description: "ID du filtre personnel" })
  @ApiOkResponse({ description: "Filtre renommé", type: SavedFilterDto })
  @ApiBadRequestResponse({
    description: "Nom vide ou trop long",
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: "Nom déjà pris par un autre filtre personnel",
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: "Filtre personnel non trouvé",
    type: ApiErrorDto,
  })
  rename(
    @User() user: UserEntity,
    @Param("id") id: string,
    @Body() body: RenameSavedFilterDto,
  ) {
    return this.service.rename(user.id, id, body.name);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Supprimer un filtre sauvegardé" })
  @ApiParam({ name: "id", description: "ID du filtre sauvegardé" })
  @ApiNoContentResponse({ description: "Filtre supprimé" })
  @ApiNotFoundResponse({ description: "Filtre sauvegardé non trouvé" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@User() user: UserEntity, @Param("id") id: string) {
    return this.service.delete(user.id, id);
  }
}
