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
import { AppAction } from "src/common/decorators/application.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import { CreateLabelDto } from "./dto/create-label.dto";
import { LabelDto } from "./dto/label.dto";
import { LabelsService } from "./labels.service";

@ApiTags("Labels")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/labels")
export class LabelsController {
  constructor(private readonly service: LabelsService) {}

  @Post()
  @AppAction("writeBase")
  @ApiBody({ type: CreateLabelDto })
  @ApiOperation({
    summary: "Créer un nouveau label",
    description: `
**Ce endpoint permet de créer un label complet.**

Vous devez fournir les informations suivantes :
- **source**: La source de l'application (peut être vide).
- **value**: Le libellé de l'application.
    `,
  })
  @ApiCreatedResponse({
    type: LabelDto,
    description: "Label créé avec succès.",
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @UserId() userId: string,
    @Body() createLabelDto: CreateLabelDto,
    @Param("applicationId") applicationId: string,
  ): Promise<LabelDto> {
    return this.service.create({
      ...createLabelDto,
      application: {
        connect: {
          id: applicationId,
        },
      },
      metadatas: {
        create: {
          applicationId,
          createdById: userId,
          description: `Ajout du libellé : ${createLabelDto.value}`,
        },
      },
    });
  }

  @Get()
  @AppAction("readBase")
  @ApiOperation({
    summary: "Récupérer les labels par ID d'application",
    description: `
Ce endpoint permet de récupérer la liste de tous les labels d'une application en fonction de son identifiant unique.

Le paramètre **applicationId** doit être fourni dans l'URL.
    `,
  })
  @ApiOkResponse({
    description: "Liste des labels",
    type: LabelDto,
    isArray: true,
  })
  async findAllSorted(@Param("applicationId") applicationId: string) {
    return this.service.findAllSorted(applicationId);
  }

  @Patch(":id")
  @AppAction("writeBase")
  @ApiOperation({
    summary: "Mettre à jour un label existant",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID du label" })
  @ApiBody({ type: CreateLabelDto })
  @ApiOkResponse({
    description: "Label mis à jour",
    type: LabelDto,
  })
  update(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @Body() updateLabelDto: CreateLabelDto,
  ) {
    return this.service.updateWithMetadata({
      id,
      data: updateLabelDto,
      userId,
      applicationId,
      gender: "du libellé alternatif",
      entityName: "labelId",
      metadataFields: {
        source: "source",
        value: "valeur",
      },
      getName: entity => entity.value,
    });
  }

  @Delete(":id")
  @AppAction("writeBase")
  @ApiOperation({
    summary: "Supprimer un label",
    description: ` Ce endpoint permet de supprimer un label existant. 
    Vous devez fournir l'identifiant du label dans l'URL.
    `,
  })
  @ApiNoContentResponse({
    description: "Label supprimé avec succès",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    await this.service.deleteWithMetadata({
      id,
      userId,
      applicationId,
      gender: "du libellé alternatif",
      name: "value",
    });
  }
}
