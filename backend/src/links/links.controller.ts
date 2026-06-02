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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import {
  CreateLinkDto,
  LinkDto,
  LinkFiltersDto,
  UpdateLinkDto,
} from "./dto/links.dto";
import { LinksService } from "./links.service";
import { PaginatedResponseDto } from "src/common/dto";

@ApiTags("Links")
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/links")
export class ApplicationLinksController {
  constructor(private readonly service: LinksService) {}

  @Post()
  @RequiredPermissions([Permission.LinkWrite])
  @ApiOperation({ summary: "Créer un lien pour une application" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Lien créé avec succès",
    type: LinkDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async create(
    @UserId() userId: string,
    @Body() createLinkDto: CreateLinkDto,
    @Param("applicationId") applicationId: string,
  ) {
    return this.service.createLink(applicationId, createLinkDto, userId);
  }

  @Get()
  @RequiredPermissions([Permission.LinkRead])
  @ApiOperation({
    summary: "Récupérer les liens d'une application",
    description: "Liste des liens associés à une application",
  })
  @ApiOkResponse({
    description: "Liste des liens de l'application",
    type: PaginatedResponseDto.of(LinkDto),
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: LinkFiltersDto,
  ) {
    return this.service.find({ ...filters, applicationId });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.LinkWrite])
  @ApiOperation({ summary: "Mettre à jour un lien d'une application" })
  @ApiOkResponse({ description: "Lien mis à jour avec succès", type: LinkDto })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID du lien à mettre à jour" })
  update(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @Body() updateLinkDto: UpdateLinkDto,
  ) {
    return this.service.updateLink(id, applicationId, updateLinkDto, userId);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.LinkWrite])
  @ApiOperation({ summary: "Supprimer un lien d'une application" })
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Lien supprimé avec succès" })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID du lien à supprimer" })
  delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    return this.service.deleteLink(id, applicationId, userId);
  }
}
