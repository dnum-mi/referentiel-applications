import {
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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ActorType } from "@prisma/client";
import { RequiredAdminLevel } from "src/common/decorators/admin.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { AdminLevel } from "src/user/entities/user.entity";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";
import { ActorTypeService } from "./actorType.service";
import {
  ActorTypeDto,
  CreateActorTypeDto,
  PatchActorTypeDto,
} from "./dto/actorType.dto";
import { AppPermsDto } from "./dto/app-perms-matrix.dto";

/**
 * Controller la gestion des types d'acteur
 * Permet de créer, mettre à jour, modifier
 */
@ApiTags("actorTypes")
@UseGuards(AdminGuard)
@Controller("actorTypes")
export class ActorTypeController {
  constructor(private readonly actorTypeService: ActorTypeService) {}

  /**
   * Crée un nouveau type d'acteur
   * Cette méthode permet de créer un type d'acteur en utilisant les données fournies
   *
   * @param CreateActorTypeDto Les données nécessaires pour créer un nouveau type d'acteur
   *
   * @returns Le nouveau type d'acteur créé
   * @throws BadRequestException Si le token est invalide ou l'identifiant utilisateur est manquant
   */
  @Post()
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiBody({ type: CreateActorTypeDto })
  @ApiOperation({
    summary: "Créer un nouveau type d’acteur",
    description: `
**Ce endpoint permet de créer un type d’acteur complète**

Vous devez fournir les informations suivantes :
- **code**: Le code du type d’acteur
- **label**: Le libellé du type d’acteur
- **description**: La description du type d’acteur
    `,
  })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "type d’acteur créé avec succes",
    type: ActorTypeDto,
  })
  public async create(@Body() CreateActorTypeDto: CreateActorTypeDto) {
    return this.actorTypeService.create(CreateActorTypeDto);
  }

  @Get("/perms-matrix")
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: "Récupérer la matrice des permissions",
    description:
      "Cet endpoint permet de récupérer la matrice des permissions pour les types d’acteurs.",
  })
  @ApiOkResponse({
    type: AppPermsDto,
    isArray: true,
    description: "Liste les types d’acteurs par id et de leurs permissions",
  })
  public async getMatrix(): Promise<AppPermsDto[]> {
    return this.actorTypeService.getPermsMatrix();
  }

  /**
   * Récupère un type d'acteur spécifique par son ID
   *
   * @param id L'identifiant du type d'acteur à récupérer
   *
   * @returns Le type d'acteur correspondant à l'ID spécifié
   * @throws NotFoundException Si le type d'acteur n'est pas trouvée
   */
  @Get(":id")
  @RequiredAdminLevel(AdminLevel.NONE)
  @ApiOkResponse({
    type: ActorTypeDto,
    description: "Récupère un type d’acteur spécifique par ID",
  })
  @ApiOperation({
    summary: "Récupérer un type d’acteur spécifique par ID",
    description:
      "Cet endpoint permet de récupérer les détails complets d'un type d’acteur en fonction de son identifiant unique.",
  })
  public async findOne(@Param("id") id: string): Promise<ActorType> {
    return this.actorTypeService.findOne(id);
  }

  @Patch("/perms-matrix")
  @ApiOperation({
    summary: "Mettre à jour la matrice des permissions",
    description:
      "Cet endpoint permet de mettre à jour la matrice des permissions pour les types d’acteurs.",
  })
  @ApiOkResponse({
    type: AppPermsDto,
    isArray: true,
    description: "Met à jour la matrice des permissions",
  })
  @ApiBody({
    type: AppPermsDto,
    isArray: true,
    description:
      "Liste des permissions à mettre à jour pour les types d’acteurs",
  })
  public async updateMatrix(
    @Body() appPermsMatrix: AppPermsDto[],
  ): Promise<AppPermsDto[]> {
    return this.actorTypeService.updatePermsMatrix(appPermsMatrix);
  }

  @Get()
  @RequiredAdminLevel(AdminLevel.NONE)
  @ApiOperation({
    summary: "Récupérer tous les types d’acteurs",
    description:
      "Ce endpoint permet de récupérer la liste de tous les types d’acteurs disponibles.",
  })
  @ApiOkResponse({
    description: "Liste les types d’acteurs",
    type: PaginatedResponseDto<ActorTypeDto>,
  })
  public async findAll(@Query() filters: PaginationDto) {
    return this.actorTypeService.findAll(filters);
  }

  /**
   * Met à jour les informations d'un type d’acteur
   *
   * @param id L'identifiant du type d'acteur à mettre à jour
   * @param actorTypeToUpdate Les nouvelles données du type d'acteur à mettre à jour
   *
   * @returns Le type d'acteur mis à jour
   */
  @Patch(":id")
  @RequiredAdminLevel(AdminLevel.WRITE)
  @ApiOperation({
    summary: "Mettre à jour un type d’acteur",
    description: `
Ce endpoint permet de mettre à jour un type d’acteur existante
Vous devez fournir l'identifiant du type d’acteur dans l'URL et les nouvelles données dans le corps de la requête
Les données de mise à jour doivent correspondre aux champs
    `,
  })
  @ApiOkResponse({
    type: PatchActorTypeDto,
    description: "Type d’acteur mis à jour avec succès",
  })
  public async update(
    @Param("id") id: string,
    @Body() actorTypeToUpdate: PatchActorTypeDto,
  ): Promise<PatchActorTypeDto> {
    Logger.log({
      message: "Début de la modification du type d’acteur ",
      actorTypeToUpdate,
      action: "patch",
    });

    return this.actorTypeService.update(id, actorTypeToUpdate);
  }

  @Delete(":id")
  @RequiredAdminLevel(AdminLevel.WRITE)
  @ApiOperation({ summary: "Supprimer un type d’acteur" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Type d’acteur supprimé avec succès",
  })
  public async delete(@Param("id") id: string) {
    return this.actorTypeService.delete(id);
  }
}
