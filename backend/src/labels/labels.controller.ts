import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
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
import { CreateLabelDto } from "./dto/create-label.dto";
import { LabelDto } from "./dto/label.dto";
import { LabelsService } from "./labels.service";

@ApiTags("Labels")
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/labels")
export class LabelsController {
  constructor(private readonly service: LabelsService) {}

  @Post()
  @RequiredPermissions([Permission.writeBase])
  @ApiBody({ type: CreateLabelDto })
  @ApiOperation({
    summary: "Créer un nouveau nom",
    description: `
**Ce endpoint permet de créer un nom complet.**

Vous devez fournir les informations suivantes :
- **labelSourceId**: L'id de la source du nom (peut être vide).
- **value**: Le nom alternatif de l'application.
    `,
  })
  @ApiCreatedResponse({
    type: LabelDto,
    description: "Nom alternatif créé avec succès.",
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @UserId() userId: string,
    @Body() createLabelDto: CreateLabelDto,
    @Param("applicationId") applicationId: string,
  ): Promise<LabelDto> {
    return this.service.create(
      {
        value: createLabelDto.value,
        application: { connect: { id: applicationId } },
        ...(createLabelDto.labelSourceId && {
          labelSource: { connect: { id: createLabelDto.labelSourceId } },
        }),
      },
      {
        applicationId,
        metadata: {
          userId,
          gender: "du nom alternatif",
          getColumn: (entity) => entity.value,
          entity: "labelId",
        },
      },
    );
  }

  @Get()
  @RequiredPermissions([Permission.readBase])
  @ApiOperation({
    summary: "Récupérer les noms alternatifs par ID d'application",
    description: `
Ce endpoint permet de récupérer la liste de tous les noms alternatifs d'une application en fonction de son identifiant unique.

Le paramètre **applicationId** doit être fourni dans l'URL.
    `,
  })
  @ApiOkResponse({
    description: "Liste des noms alternatifs",
    type: LabelDto,
    isArray: true,
  })
  async findAllSorted(@Param("applicationId") applicationId: string) {
    return this.service.findAllSorted(applicationId);
  }

  @Patch(":id")
  @RequiredPermissions([Permission.writeBase])
  @ApiOperation({
    summary: "Mettre à jour un nom existant",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID du nom" })
  @ApiBody({ type: CreateLabelDto })
  @ApiOkResponse({
    description: "Nom alternatif mis à jour",
    type: LabelDto,
  })
  update(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @Body() updateLabelDto: CreateLabelDto,
  ) {
    const updateLabel: any = {
      value: updateLabelDto.value,
    };

    if (updateLabelDto.labelSourceId) {
      updateLabel.labelSource = {
        connect: { id: updateLabelDto.labelSourceId },
      };
    } else {
      updateLabel.labelSource = { disconnect: true };
    }

    return this.service.update(id, updateLabel, {
      applicationId,
      include: { labelSource: true },
      metadata: {
        userId,
        entity: "labelId",
        gender: "du nom alternatif",
        getColumn: (entity) => entity.value,
        fields: {
          "labelSource.source": "source",
          value: "valeur",
        },
      },
    });
  }

  @Delete(":id")
  @RequiredPermissions([Permission.writeBase])
  @ApiOperation({
    summary: "Supprimer un nom alternatif",
    description: ` Ce endpoint permet de supprimer un nom alternatif existant. 
    Vous devez fournir l'identifiant du nom alternatif dans l'URL.
    `,
  })
  @ApiNoContentResponse({
    description: "Nom alternatif supprimé avec succès",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    await this.service.delete(id, {
      applicationId,
      metadata: {
        userId,
        gender: "du nom alternatif",
        getColumn: (entity) => entity.value,
        entity: "labelId",
      },
    });
  }
}
