import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { FeatureFlag } from "src/common/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/feature-flag/feature-flag.guard";
import { FeatureFlagKey } from "src/feature-flag/feature-flag.keys";
import { Requestor } from "src/user/entities/user.entity";
import {
  CreatePersonalTokenDto,
  CreateServiceTokenDto,
  ExposedTokenDto,
  ListTokensDto,
  RegenerateTokenDto,
  TokenDto,
} from "./dto/token.dto";
import { TokenService } from "./token.service";

/**
 * Controller la gestion des organisations
 * Permet de créer, mettre à jour,
 */
@ApiTags("tokens")
@Controller("tokens")
@FeatureFlag(FeatureFlagKey.API_TOKENS)
@UseGuards(PermissionGuard, FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get()
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Récupère les tokens de manière paginée",
    description:
      "Cette méthode permet de récupérer les tokens (applicatifs et personnels), avec pagination et filtre optionnel par type.",
  })
  @ApiOkResponse({
    description: "Liste paginée des tokens récupérée avec succès",
    type: PaginatedResponseDto.of(TokenDto),
  })
  async list(
    @Query() query: ListTokensDto,
  ): Promise<PaginatedResponseDto<TokenDto>> {
    return this.tokenService.listPaginated({
      kind: query.kind,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get("personal")
  @ApiOperation({
    summary: "Récupère tous les tokens personnels",
    description:
      "Cette méthode permet de récupérer tous les tokens personnels.",
  })
  @ApiOkResponse({
    description: "Liste des tokens récupérée avec succès",
    type: TokenDto,
    isArray: true,
  })
  async findPersonal(@User() requestor: Requestor): Promise<TokenDto[]> {
    return this.tokenService.list({ requestor });
  }

  @Post()
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Crée un nouveau token de service",
    description: "Cette méthode permet de créer un nouveau token de service.",
  })
  @ApiCreatedResponse({
    description: "Token créé avec succès",
    type: ExposedTokenDto,
  })
  async createService(
    @User() requestor: Requestor,
    @Body() data: CreateServiceTokenDto,
  ) {
    return this.tokenService.create(requestor, false, {
      ...data,
      expiresAt: new Date(data.expiresAt),
    });
  }

  @Post("personal")
  @ApiOperation({
    summary: "Crée un nouveau token personnel",
    description: "Cette méthode permet de créer un nouveau token personnel.",
  })
  @ApiCreatedResponse({
    description: "Token créé avec succès",
    type: ExposedTokenDto,
  })
  async createPersonal(
    @User() requestor: Requestor,
    @Body() data: CreatePersonalTokenDto,
  ) {
    return this.tokenService.create(requestor, true, {
      ...data,
      expiresAt: new Date(data.expiresAt),
      role: requestor.role,
    });
  }

  @Post(":id/regenerate")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Régénère un token de service",
    description: "Cette méthode permet de régénérer un token de service.",
  })
  @ApiOkResponse({
    description: "Token régénéré avec succès",
    type: TokenDto,
  })
  async regenerate(
    @User() requestor: Requestor,
    @Param("id") id: string,
    @Body() body: RegenerateTokenDto,
  ) {
    return this.tokenService.regenerate(
      requestor,
      id,
      new Date(body.expiresAt),
    );
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Supprime (révoque) un token de service",
    description:
      "Cette méthode permet de supprimer (révoquer) un token de service.",
  })
  @ApiNoContentResponse({
    description: "Token supprimé avec succès",
  })
  @HttpCode(204)
  async delete(@User() requestor: Requestor, @Param("id") id: string) {
    return this.tokenService.delete(requestor, id);
  }

  @Delete("personal/:id")
  @ApiOperation({
    summary: "Supprime (révoque) un token personnel",
    description:
      "Cette méthode permet de supprimer (révoquer) un token personnel.",
  })
  @ApiNoContentResponse({
    description: "Token supprimé avec succès",
  })
  @HttpCode(204)
  async deletePersonal(@User() requestor: Requestor, @Param("id") id: string) {
    return this.tokenService.delete(requestor, id);
  }
}
