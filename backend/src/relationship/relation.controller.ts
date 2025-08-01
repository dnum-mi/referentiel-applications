import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { RelationService } from "./relation.service";
import { RelationApplicationDto } from "./application/dto/relation-application.dto";
import { Relation } from "./domain/relation.entity";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
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
  @ApiOperation({ summary: "Créer une nouvelle relation" })
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
  @ApiOperation({ summary: "Récupérer toutes les relations d'une application" })
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
  async update(
    @UserId() userId: string,
    @Param("id") id: string,
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
