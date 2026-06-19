import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserId } from "src/common/decorators/user-id.decorator";
import { ImportReportDto } from "./dto/import-report.dto";
import { ExcelImportService } from "./excel-import.service";

@ApiTags("Import")
@UseGuards(PermissionGuard)
@Controller("import")
export class ImportController {
  constructor(private readonly excelImportService: ExcelImportService) {}

  @Post("excel")
  @RequiredPermissions([Permission.AdminPanelManage])
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Importer des données depuis un fichier Excel",
    description: `Importe ou met à jour des données en masse à partir d'un fichier Excel
au même format que l'export (un onglet par table). Les onglets pris en charge sont traités
(actuellement : « Acteurs » et « Conformités ») ; les autres sont ignorés. Pour chaque ligne,
la présence de l'identifiant déclenche une mise à jour, sinon une création. Les contrôles et
les métadonnées sont identiques à ceux de l'API. Un rapport d'exécution est retourné.`,
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
      message: "Début de l'import Excel",
      userId,
      action: "import",
    });
    try {
      return await this.excelImportService.importFromExcel(file.buffer, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }
}
