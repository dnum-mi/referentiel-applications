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
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { FeatureFlag } from "src/common/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/feature-flag/feature-flag.guard";
import { FeatureFlagKey } from "src/feature-flag/feature-flag.keys";
import { UserId } from "../common/decorators/user-id.decorator";
import {
  RelationApplicationDto,
  RelationDto,
  RelationGraphDto,
} from "./application/dto/relation-application.dto";
import { RelationService } from "./relation.service";

@ApiTags("relation")
@FeatureFlag(FeatureFlagKey.RELATIONS)
@UseGuards(PermissionGuard, FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
@ApiParam({
  name: "applicationId",
  description: "ID de l'application",
  type: String,
})
@Controller("applications/:applicationId/relations")
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post()
  @RequiredPermissions([Permission.RelationWrite])
  @HttpCode(201)
  @ApiCreatedResponse({
    type: RelationDto,
    description: "Relation créée avec succès",
  })
  @ApiOperation({
    summary: "Créer une nouvelle relation",
    description: "Permet de créer une relation entre deux applications.",
  })
  create(
    @Param("applicationId") applicationId: string,
    @Body() dto: RelationApplicationDto,
    @UserId() userId: string,
  ): Promise<RelationDto> {
    return this.relationService.create(applicationId, dto, userId);
  }

  @Get()
  @RequiredPermissions([Permission.RelationRead])
  @ApiOkResponse({
    description: "Liste des relations trouvées",
    type: RelationDto,
    isArray: true,
  })
  @ApiOperation({
    summary: "Récupérer toutes les relations d'une application",
    description:
      "Renvoie la liste de toutes les relations d'une application donnée.",
  })
  findAll(
    @Param("applicationId") applicationId: string,
  ): Promise<RelationDto[]> {
    return this.relationService.findAllForApplicationSource(applicationId);
  }

  @Get("graph")
  @RequiredPermissions([Permission.RelationRead])
  @ApiOkResponse({
    description: "Graphe des relations de l'application",
    type: RelationGraphDto,
  })
  @ApiOperation({
    summary: "Récupérer le graphe des relations d'une application",
    description:
      "Renvoie un graphe des relations de l'application avec possibilité de limiter la profondeur. Les applications supprimées sont exclues.",
  })
  @ApiQuery({
    name: "depth",
    description:
      "Profondeur maximale de traversée du graphe (par défaut: 2, max: 100)",
    required: false,
    type: Number,
  })
  getRelationGraph(
    @Param("applicationId") applicationId: string,
    @Query("depth") depth?: number,
  ): Promise<RelationGraphDto> {
    const maxDepth = depth ? Math.max(1, Math.min(Number(depth), 100)) : 1;
    return this.relationService.getRelationGraph(applicationId, maxDepth);
  }

  @Get(":id")
  @RequiredPermissions([Permission.RelationRead])
  @ApiOperation({
    summary: "Récupérer une relation par son identifiant unique",
  })
  @ApiOkResponse({
    type: RelationDto,
    description: "Relation trouvée avec succès",
  })
  @ApiParam({ name: "id", description: "Identifiant unique de la relation" })
  async findOne(@Param("id") id: string): Promise<RelationDto> {
    return this.relationService.findOne(id);
  }

  @Patch(":id")
  @RequiredPermissions([Permission.RelationWrite])
  @ApiOperation({ summary: "Mettre à jour une relation" })
  @ApiParam({
    name: "id",
    description: "Identifiant unique de la relation à mettre à jour",
  })
  @ApiOkResponse({
    type: RelationDto,
    description: "Relation mise à jour avec succès",
  })
  update(
    @UserId() userId: string,
    @Param("id") id: string,
    @Param("applicationId") _applicationId: string,
    @Body() dto: RelationApplicationDto,
  ): Promise<RelationDto> {
    return this.relationService.update(id, dto, userId);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.RelationWrite])
  @ApiOperation({ summary: "Supprimer une relation" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Relation supprimée avec succès",
  })
  @ApiParam({
    name: "id",
    description: "Identifiant unique de la relation à supprimer",
  })
  async delete(
    @UserId() userId: string,
    @Param("id") id: string,
  ): Promise<void> {
    return this.relationService.delete(id, userId);
  }
}
