import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RequiredAdminLevel } from "src/common/decorators/admin.decorator";
import { User } from "src/common/decorators/user.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";
import {
  CreatePersonalTokenDto,
  CreateServiceTokenDto,
  ExposedTokenDto,
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
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get()
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: "Récupère tous les tokens de service",
    description:
      "Cette méthode permet de récupérer tous les tokens de service.",
  })
  @ApiOkResponse({
    description: "Liste des tokens récupérée avec succès",
    type: TokenDto,
    isArray: true,
  })
  async list(): Promise<TokenDto[]> {
    return this.tokenService.list({});
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
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
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
    });
  }

  @Post(":id/regenerate")
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
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
