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
import { ApplicationService } from "src/applications/application.service";
import { User } from "../common/decorators/user.decorator";
import { MetadatasService } from "../metadatas/metadatas.service";
import { Requestor } from "../user/entities/user.entity";
import {
  ApplicationStatusDto,
  CreateApplicationStatusDto,
} from "./dto/application-status.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";
import { StatusesService } from "./statuses.service";

@ApiTags("statuses")
@Controller("applications/:applicationId/statuses")
@UseGuards(PermissionGuard)
export class StatusesController {
  constructor(
    private readonly statusesService: StatusesService,
    private readonly applicationService: ApplicationService,
    private readonly metadataService: MetadatasService,
  ) {}

  @Post()
  @RequiredPermissions([Permission.AppWrite])
  @HttpCode(201)
  @ApiOperation({ summary: "Créer un nouveau statut pour une application" })
  @ApiCreatedResponse({
    description: "Statut créé avec succès",
    type: ApplicationStatusDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async create(
    @Param("applicationId") applicationId: string,
    @Body() createStatusDto: CreateApplicationStatusDto,
    @User() requestor: Requestor,
  ) {
    const createdStatus = await this.statusesService.create({
      ...createStatusDto,
      applicationId,
    });

    await this.statusesService.updateCurrentStatus(applicationId);
    await this.applicationService.updateApplicationQuality(applicationId);
    await this.metadataService.createMetadata({
      applicationId,
      createdById: requestor.id,
      title: "du statut de l'application",
      type: "add",
    });

    return createdStatus;
  }

  @Get()
  @RequiredPermissions([Permission.AppRead])
  @ApiOperation({
    summary: "Récupérer l'historique des statuts d'une application",
  })
  @ApiOkResponse({
    description: "Historique des statuts récupéré avec succès",
    type: [ApplicationStatusDto],
  })
  async find(@Param("applicationId") applicationId: string) {
    return this.statusesService.find({ applicationId }) || [];
  }

  @Patch(":statusId")
  @RequiredPermissions([Permission.AppWrite])
  @ApiOperation({ summary: "Modifier un statut existant" })
  @ApiOkResponse({
    description: "Statut modifié avec succès",
    type: ApplicationStatusDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "statusId", description: "ID du statut" })
  async update(
    @Param("applicationId") applicationId: string,
    @Param("statusId") statusId: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
    @User() requestor: Requestor,
  ) {
    const oldData = await this.statusesService.findOne(statusId);

    const updatedStatus = await this.statusesService.update(
      statusId,
      updateStatusDto,
    );

    await this.statusesService.updateCurrentStatus(applicationId);
    await this.applicationService.updateApplicationQuality(applicationId);
    await this.metadataService.createMetadata({
      applicationId,
      createdById: requestor.id,
      title: "du statut de l'application",
      fields: {
        status: "Statut",
        statusDate: "Date du statut",
        version: "Version",
      },
      oldData,
      newData: updatedStatus,
    });

    return updatedStatus;
  }

  @Delete(":statusId")
  @RequiredPermissions([Permission.AppWrite])
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer un statut" })
  @ApiNoContentResponse({
    description: "Statut supprimé avec succès",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "statusId", description: "ID du statut" })
  async delete(
    @Param("applicationId") applicationId: string,
    @Param("statusId") statusId: string,
    @User() requestor: Requestor,
  ) {
    const statusToDelete = await this.statusesService
      .find({ applicationId })
      .then((statuses) => statuses.find((status) => status.id === statusId));

    if (!statusToDelete) {
      return;
    }

    await this.statusesService.delete(statusId);
    await this.statusesService.updateCurrentStatus(applicationId);
    await this.applicationService.updateApplicationQuality(applicationId);

    await this.metadataService.createMetadata({
      applicationId,
      createdById: requestor.id,
      title: "du statut de l'application",
      type: "delete",
    });
  }
}
