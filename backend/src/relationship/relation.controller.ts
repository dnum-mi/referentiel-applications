import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { RelationService } from "./relation.service";
import { RelationApplicationDto, RelationDto } from "./application/dto/relation-application.dto";
import { Relation } from "./domain/relation.entity";
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { UserId } from "../common/decorators/user-id.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { AppAction } from "src/common/decorators/application.decorator";

@ApiTags("relation")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/relations")
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post()
  @AppAction("writeRelations")
  @ApiParam({
    name: "applicationId",
    description: "ID de l'application SOURCE",
  })
  @HttpCode(201)
  @ApiCreatedResponse({
    type: RelationDto,
    description: "Relation créée avec succès",
  })
  @ApiOperation({
    summary: "Créer une nouvelle relation",
    description: "Permet de créer une relation entre deux applications.",
  })
  async create(
    @Param("applicationId") applicationId: string,
    @Body() dto: RelationApplicationDto,
    @UserId() userId: string,
  ): Promise<Relation> {
    return this.relationService.create(applicationId, dto, userId);
  }

  @Get()
  @AppAction("readRelations")
  @ApiParam({
    name: "applicationId",
    description: "ID de l'application SOURCE",
  })
  @ApiOkResponse({
    description: "Liste des relations trouvées",
    type: RelationDto,
    isArray: true,
  })
  @ApiOperation({
    summary: "Récupérer toutes les relations d'une application",
    description: "Renvoie la liste de toutes les relations d'une application donnée.",
  })
  async findAll(
    @Param("applicationId") applicationId: string,
  ): Promise<Relation[]> {
    return this.relationService.findAllForApplicationSource(applicationId);
  }

  @Get(":id")
  @AppAction("readRelations")
  @ApiOperation({
    summary: "Récupérer une relation par son identifiant unique",
  })
  @ApiOkResponse({
    type: RelationDto,
    description: "Relation trouvée avec succès",
  })
  @ApiParam({ name: "id", description: "Identifiant unique de la relation" })
  async findOne(@Param("id") id: string): Promise<Relation> {
    return this.relationService.findOne(id);
  }

  @Patch(":id")
  @AppAction("writeRelations")
  @ApiParam({
    name: "applicationId",
    description: "ID de l'application SOURCE",
  })
  @ApiOperation({ summary: "Mettre à jour une relation" })
  @ApiParam({
    name: "id",
    description: "Identifiant unique de la relation à mettre à jour",
  })
  @ApiOkResponse({
    type: RelationDto,
    description: "Relation mise à jour avec succès",
  })
  async update(
    @UserId() userId: string,
    @Param("id") id: string,
    @Param("applicationId") _applicationId: string,
    @Body() dto: RelationApplicationDto,
  ): Promise<Relation> {
    return this.relationService.update(id, dto, userId);
  }

  @Delete(":id")
  @AppAction("writeRelations")
  @ApiParam({
    name: "applicationId",
    description: "ID de l'application SOURCE",
  })
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
