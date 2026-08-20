import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { User } from "src/common/decorators/user.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserEntity } from "src/user/entities/user.entity";
import { CreateSavedFilterDto } from "./dto/create-saved-filter.dto";
import { SavedFilterDto } from "./dto/saved-filter.dto";
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
