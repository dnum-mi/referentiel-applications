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
  ApiTags,
} from "@nestjs/swagger";
import {
  CreateLabelSourceDto,
  LabelSourceDto,
  LabelSourceFiltersDto,
  UpdateLabelSourceDto,
} from "./dto/label-source.dto";
import { LabelSourceService } from "./label-source.service";
import { RequiredAdminLevel } from "src/common/decorators/admin.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { AdminLevel } from "src/user/entities/user.entity";
import { AppAction } from "src/common/decorators/application.decorator";

@ApiTags("LabelSources")
@Controller("label-sources")
export class LabelSourceController {
  constructor(private readonly labelSourceService: LabelSourceService) {}

  @Post()
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: "Créer une nouvelle source de libellés.",
    description: `
Ce endpoint permet de créer une nouvelle source de libellés alternatifs.

Information requise : 
- **source** : nom de la source
    `,
  })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Source créée avec succès",
    type: LabelSourceDto,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  create(@Body() createLabelSourceDto: CreateLabelSourceDto) {
    return this.labelSourceService.create(createLabelSourceDto);
  }

  @Get()
  @AppAction("readBase")
  @ApiOperation({
    summary:
      "Rechercher des sources de libellés alternatifs avec filtre en option.",
  })
  @ApiOkResponse({
    description: "Liste des sources trouvées",
    type: LabelSourceDto,
    isArray: true,
  })
  findAll(@Query() filters: LabelSourceFiltersDto) {
    return this.labelSourceService.findAll(filters);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({ summary: "Modifier une source de libellés alternatifs" })
  @ApiOkResponse({
    description: "Source mise à jour avec succès",
    type: LabelSourceDto,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Source non trouvée" })
  update(
    @Param("id") id: string,
    @Body() updateLabelSourceDto: UpdateLabelSourceDto,
  ) {
    return this.labelSourceService.update(id, updateLabelSourceDto);
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({ summary: "Supprimer une source de libellés alternatifs" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Source supprimée avec succès",
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({
    description: "Source non trouvée",
  })
  remove(@Param("id") id: string) {
    return this.labelSourceService.delete(id);
  }
}
