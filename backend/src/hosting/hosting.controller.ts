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
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AppAction } from "src/common/decorators/application.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import { CreateHostingDto, HostingDto, UpdateHostingDto } from "./applications/dto/hosting.dto";
import { HostingService } from "./hosting.service";

@ApiTags("Hostings")
@Controller("hostings")
export class HostingController {
  constructor(private readonly hostingService: HostingService) {}

  @Get("count")
  @ApiOperation({
    summary: "Récupérer le nombre total d'hébergements (toutes applications)",
  })
  @ApiOkResponse({
    description: "Nombre total d'hébergements",
    type: Number,
  })
  public async countAllHostings(): Promise<number> {
    return this.hostingService.count();
  }
}

@ApiTags("Hostings")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/hostings")
@ApiParam({ name: "applicationId", description: "ID de l'application", type: String })
export class ApplicationHostingsController {
  constructor(private readonly hostingService: HostingService) {}

  @Post()
  @AppAction("writeHostings")
  @ApiOperation({ summary: "Créer un hébergement pour une application" })
  @ApiCreatedResponse({
    description: "Hébergement créé",
    type: HostingDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Body() dto: CreateHostingDto,
  ) {
    // Ajoute l'ID de l'application provenant de l'URL dans le DTO
    return this.hostingService.create({ ...dto, applicationId }, userId);
  }

  @Get()
  @AppAction("readHostings")
  @ApiOperation({
    summary: "Récupérer tous les hébergements d'une application",
  })
  @ApiOkResponse({
    description: "Liste des hébergements",
    type: HostingDto,
    isArray: true,
  })
  findAll(@Param("applicationId") applicationId: string) {
    return this.hostingService.findByApplicationId(applicationId);
  }

  @Get(":id")
  @AppAction("readHostings")
  @ApiOperation({
    summary: "Récupérer un hébergement par ID pour une application",
  })
  @ApiOkResponse({
    description: "Hébergement trouvé",
    type: HostingDto,
  })
  findOne(@Param("id") id: string) {
    return this.hostingService.findOne(id);
  }

  @Patch(":id")
  @AppAction("writeHostings")
  @ApiOperation({
    summary: "Mettre à jour un hébergement pour une application",

  })
  @ApiOkResponse({
    description: "Hébergement mis à jour",
    type: HostingDto,
  })
  update(
    @UserId() userId: string,
    @Param("id") id: string,
    @Param("applicationId") applicationId: string,
    @Body() dto: UpdateHostingDto,
  ) {
    return this.hostingService.update(id, { ...dto, applicationId }, userId);
  }

  @Delete(":id")
  @AppAction("writeHostings")
  @ApiOperation({ summary: "Supprimer un hébergement pour une application" })
  @ApiNoContentResponse({ description: "Hébergement supprimé" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @UserId() userId: string,
    @Param("id") id: string,
  ) {
    await this.hostingService.remove(id, userId);
  }
}
