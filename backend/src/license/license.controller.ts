import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserId } from "src/common/decorators/user-id.decorator";
import {
  CreateLicenseDto,
  LicenseDto,
  LicenseErrorResponseDto,
} from "./dto/license.dto";
import { LicenseService } from "./license.service";

const LICENSE_METADATA_FIELDS = {
  name: "licence",
  version: "version",
};

@ApiTags("Licenses")
@ApiExtraModels(LicenseErrorResponseDto)
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/licenses")
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get()
  @RequiredPermissions([Permission.AppRead])
  @ApiOperation({
    summary: "Lister les licences d'une application",
  })
  @ApiOkResponse({
    description: "Liste des licences",
    type: [LicenseDto],
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async findAll(@Param("applicationId") applicationId: string) {
    return this.licenseService.findAllByApplicationId(applicationId);
  }

  @Post()
  @RequiredPermissions([Permission.AppWrite])
  @ApiOperation({
    summary: "Ajouter une licence à une application",
  })
  @ApiCreatedResponse({
    description: "Licence ajoutée avec succès",
    type: LicenseDto,
  })
  @ApiConflictResponse({
    description: "Cette licence est déjà renseignée pour cette application",
    type: LicenseErrorResponseDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async create(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Body() dto: CreateLicenseDto,
  ) {
    return this.licenseService.createLicense(applicationId, dto, {
      applicationId,
      metadata: {
        userId,
        gender: "de la licence",
        getColumn: () => dto.name,
        entity: "licenseId",
        fields: LICENSE_METADATA_FIELDS,
      },
    });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.AppWrite])
  @HttpCode(200)
  @ApiOperation({
    summary: "Mettre à jour une licence",
  })
  @ApiOkResponse({
    description: "Licence mise à jour avec succès",
    type: LicenseDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID de la licence" })
  async update(
    @Param("applicationId") applicationId: string,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: CreateLicenseDto,
  ) {
    return this.licenseService.updateLicense(id, applicationId, dto, {
      applicationId,
      metadata: {
        userId,
        gender: "de la licence",
        getColumn: () => dto.name,
        entity: "licenseId",
        fields: LICENSE_METADATA_FIELDS,
      },
    });
  }

  @Delete(":id")
  @RequiredPermissions([Permission.AppWrite])
  @HttpCode(204)
  @ApiOperation({
    summary: "Supprimer une licence",
  })
  @ApiNoContentResponse({
    description: "Licence supprimée",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID de la licence" })
  async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    await this.licenseService.deleteLicense(id, applicationId, {
      applicationId,
      metadata: {
        userId,
        gender: "de la licence",
        getColumn: (entity) => entity.name,
        entity: "licenseId",
        fields: LICENSE_METADATA_FIELDS,
      },
    });
  }
}
