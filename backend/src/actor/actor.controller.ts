import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Actor, Permission } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto/paginated-response.dto";
import { UserId } from "../common/decorators/user-id.decorator";
import { ActorImportService } from "./actor-import.service";
import { ActorService } from "./actor.service";
import {
  ActorDto,
  ActorFiltersDto,
  CreateActorDto,
  UpdateActorDto,
} from "./dto/actor.dto";
import { ImportReportDto } from "./dto/import-report.dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";

@ApiTags("Actors")
@UseGuards(PermissionGuard)
@Controller("actors")
export class ActorController {
  constructor(
    private readonly actorService: ActorService,
    private readonly actorImportService: ActorImportService,
  ) {}

  @Post("import/excel")
  @RequiredPermissions([Permission.AdminPanelManage])
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Importer des acteurs depuis un fichier Excel",
    description: `Importe ou met à jour des acteurs en masse à partir d'un fichier Excel
au même format que l'export (un onglet par table). Seul l'onglet « Acteurs » est traité.
Chaque ligne dont la colonne « ID Acteur » est renseignée met à jour l'acteur correspondant ;
sinon un nouvel acteur est créé. Les contrôles et métadonnées sont identiques à ceux de l'API.
Un rapport d'exécution est retourné.`,
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  @ApiOkResponse({
    description: "Rapport d'exécution de l'import",
    type: ImportReportDto,
  })
  public async importExcel(
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined,
    @UserId() userId: string,
  ): Promise<ImportReportDto> {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni.");
    }
    const isXlsx =
      file.originalname?.toLowerCase().endsWith(".xlsx") ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (!isXlsx) {
      throw new BadRequestException(
        "Le fichier doit être un classeur Excel (.xlsx).",
      );
    }
    Logger.log({
      message: "Début de l'import Excel des acteurs",
      userId,
      action: "import",
    });
    try {
      return await this.actorImportService.importFromExcel(file.buffer, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  @Get("count")
  @ApiOperation({
    summary: "Récupérer le nombre total d'acteurs (toutes applications)",
  })
  @ApiOkResponse({
    description: "Nombre total d'acteurs",
    type: Number,
  })
  public async countAllActors(): Promise<number> {
    return this.actorService.count();
  }

  @Post("sync-maia")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Synchroniser les acteurs depuis MAIA (batch)",
    description:
      "Pour chaque acteur avec un email, récupère l'organisation, le prénom et le nom depuis MAIA et met à jour l'acteur. La tâche est lancée en arrière-plan.",
  })
  @ApiOkResponse({
    description: "Batch MAIA lancé en tâche de fond",
    type: String,
  })
  public syncFromMaia() {
    return this.actorService.startSyncActorsFromMaiaInBackground();
  }
}

@ApiTags("Actors")
@UseGuards(PermissionGuard)
@ApiParam({
  name: "applicationId",
  description: "ID de l'application",
  type: String,
})
@Controller("applications/:applicationId/actors")
export class ApplicationActorsController {
  constructor(private readonly actorService: ActorService) {}

  @Post()
  @ApiBody({ type: CreateActorDto })
  @RequiredPermissions([Permission.ActorWrite])
  @ApiOperation({
    summary: "Créer un nouvel acteur",
    description: `
Ce endpoint permet de créer un acteur complet.

Informations requises : 
- **email** : Email de l'acteur
- **firstname** : Prénom de l'acteur
- **lastname** : Nom de l'acteur
- **actorTypeId** : ID du type d'acteur lié à l'acteur 
- **organizationId** : ID de l'organisation liée à l'acteur
- **applicationId** : ID de l'application liée à l'acteur
    `,
  })
  @ApiCreatedResponse({
    description: "Acteur créé avec succès",
    type: ActorDto,
  })
  public create(
    @Param("applicationId") applicationId: string,
    @Body() createActorDto: CreateActorDto,
    @UserId() userId: string,
  ) {
    Logger.log({
      message: "Début de la création de l'acteur",
      userId,
      action: "create",
    });
    return this.actorService.create(createActorDto, applicationId, userId);
  }

  @Get(":id")
  @RequiredPermissions([Permission.ActorRead])
  @ApiOperation({ summary: "Récupérer un acteur par ID" })
  @ApiOkResponse({
    description: "Acteur trouvé avec succès",
    type: ActorDto,
  })
  @ApiParam({
    name: "id",
    description: "ID de l'acteur",
  })
  public async findOne(@Param("id") id: string): Promise<Actor> {
    return this.actorService.findOne(id);
  }

  @Get()
  @RequiredPermissions([Permission.ActorRead])
  @ApiOperation({ summary: "Récupérer tous les acteurs" })
  @ApiOkResponse({
    description: "Liste des acteurs trouvés",
    type: PaginatedResponseDto.of(ActorDto),
  })
  async findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: ActorFiltersDto,
  ) {
    return this.actorService.findAll({ ...filters, applicationId });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.ActorWrite])
  @ApiOperation({ summary: "Mettre à jour un acteur" })
  @ApiOkResponse({
    description: "Acteur mis à jour avec succès",
    type: ActorDto,
  })
  @ApiParam({
    name: "id",
    description: "ID de l'acteur",
  })
  public async updated(
    @UserId() userId: string,
    @Param("id") id: string,
    @Param("applicationId") applicationId: string,
    @Body() actorToUpdate: UpdateActorDto,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la modification de l'acteur",
      actorToUpdate,
      action: "patch",
    });

    return this.actorService.update(id, actorToUpdate, applicationId, userId);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.ActorWrite])
  @ApiOperation({ summary: "Supprimer un acteur" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Acteur supprimé avec succès",
  })
  @ApiParam({
    name: "id",
    description: "ID de l'acteur",
  })
  public async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ): Promise<Actor> {
    Logger.log({
      message: "Début de la suppression de l'acteur",
      actorId: id,
      action: "delete",
    });

    return this.actorService.delete(id, applicationId, userId);
  }
}
