import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
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
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { UserId } from "src/common/decorators/user-id.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { ApiErrorDto } from "src/common/dto/api-error.dto";
import {
  PreviewSbomDto,
  SoftwareComponentsQueryDto,
  UpdateSbomSourceDto,
} from "./sbom.dto";
import { SbomService } from "./sbom.service";
import {
  sbomCommitSchema,
  sbomComponentsPageSchema,
  sbomDetailSchema,
  sbomPreviewSchema,
  sbomSourcesSchema,
  sbomHistoryPageSchema,
  sbomSourceUpdateSchema,
} from "./sbom-response.schemas";

@ApiTags("SBOM")
@ApiResponse({
  type: ApiErrorDto,
  status: 403,
  description: "Droit Technologie insuffisant sur cette application.",
})
@ApiResponse({
  type: ApiErrorDto,
  status: 404,
  description:
    "Application, source ou import introuvable dans cette application.",
})
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId")
export class SbomController {
  constructor(private readonly sbom: SbomService) {}

  @Post("sbom-imports/preview")
  @HttpCode(200)
  @ApiOkResponse({ schema: sbomPreviewSchema })
  @ApiResponse({
    type: ApiErrorDto,
    status: 400,
    description: "Document invalide ou référence interne cassée.",
  })
  @ApiResponse({
    type: ApiErrorDto,
    status: 413,
    description:
      "Limite de taille, composants, relations ou profondeur dépassée.",
  })
  @ApiResponse({
    type: ApiErrorDto,
    status: 415,
    description: "Format ou version non pris en charge.",
  })
  @RequiredPermissions([Permission.TechnologyWrite])
  @ApiOperation({
    summary:
      "Analyser un SBOM et prévisualiser les changements sans modifier l’inventaire",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "sourceName"],
      properties: {
        file: { type: "string", format: "binary" },
        sourceName: { type: "string", maxLength: 160 },
        context: { type: "string", maxLength: 500 },
        projectVersion: { type: "string", maxLength: 255 },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  preview(
    @Param("applicationId") applicationId: string,
    @UserId() userId: string,
    @Body() dto: PreviewSbomDto,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    if (!file?.buffer)
      throw new BadRequestException("Un fichier SBOM JSON est requis.");
    return this.sbom.preview(applicationId, userId, file.buffer, dto);
  }

  @Post("sbom-imports/:id/commit")
  @HttpCode(200)
  @ApiOkResponse({ schema: sbomCommitSchema })
  @ApiResponse({
    type: ApiErrorDto,
    status: 409,
    description: "Source modifiée depuis l’analyse.",
  })
  @ApiResponse({
    type: ApiErrorDto,
    status: 410,
    description: "Analyse expirée après 24 heures.",
  })
  @RequiredPermissions([Permission.TechnologyWrite])
  @ApiOperation({
    summary:
      "Confirmer atomiquement une analyse SBOM, avec revérification des droits et de la révision",
    description:
      "L’identifiant de l’URL désigne l’analyse enregistrée. Aucun corps de requête n’est attendu.",
  })
  commit(
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @UserId() userId: string,
  ) {
    return this.sbom.commit(applicationId, id, userId);
  }

  @Get("sbom-sources")
  @ApiOkResponse({ schema: sbomSourcesSchema })
  @RequiredPermissions([Permission.TechnologyRead])
  @ApiOperation({
    summary: "Consulter les sources SBOM et l’historique des imports confirmés",
  })
  sources(@Param("applicationId") applicationId: string) {
    return this.sbom.sources(applicationId);
  }

  @Get("sbom-sources/:id/imports")
  @ApiOkResponse({ schema: sbomHistoryPageSchema })
  @RequiredPermissions([Permission.TechnologyRead])
  @ApiOperation({ summary: "Consulter l’historique paginé d’une source SBOM" })
  sourceHistory(
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @Query() query: SoftwareComponentsQueryDto,
  ) {
    return this.sbom.sourceHistory(applicationId, id, query);
  }

  @Get("sbom-imports/:id")
  @ApiOkResponse({ schema: sbomDetailSchema })
  @RequiredPermissions([Permission.TechnologyRead])
  @ApiOperation({
    summary:
      "Consulter le rapport, les composants et les relations d’un import SBOM",
  })
  importDetail(
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    return this.sbom.importDetail(applicationId, id);
  }

  @Get("software-components")
  @ApiOkResponse({ schema: sbomComponentsPageSchema })
  @RequiredPermissions([Permission.TechnologyRead])
  @ApiOperation({
    summary:
      "Consulter les composants des sources SBOM actives, avec pagination",
  })
  components(
    @Param("applicationId") applicationId: string,
    @Query() query: SoftwareComponentsQueryDto,
  ) {
    return this.sbom.components(applicationId, query);
  }

  @Patch("sbom-sources/:id")
  @ApiOkResponse({ schema: sbomSourceUpdateSchema })
  @ApiResponse({
    type: ApiErrorDto,
    status: 409,
    description: "Source modifiée depuis la prévisualisation.",
  })
  @RequiredPermissions([Permission.TechnologyWrite])
  @ApiOperation({
    summary:
      "Prévisualiser ou confirmer l’activation d’une source SBOM à révision constante",
  })
  updateSource(
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @UserId() userId: string,
    @Body() dto: UpdateSbomSourceDto,
  ) {
    return this.sbom.updateSource(applicationId, id, userId, dto);
  }
}
