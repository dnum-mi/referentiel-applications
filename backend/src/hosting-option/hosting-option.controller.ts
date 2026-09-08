import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Permission } from "@prisma/client";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PaginatedResponseDto } from "src/common/dto";
import {
  CreateHostingOptionDto,
  HostingOptionDto,
  HostingOptionFiltersDto,
  UpdateHostingOptionDto,
} from "./dto/hosting-option.dto";
import { HostingOptionService } from "./hosting-option.service";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";

@ApiTags("HostingOptions")
// #2369 : ce catalogue d'options d'hébergement est PARTAGÉ (aucun `:applicationId` dans les
// routes). La lecture reste ouverte à tout utilisateur authentifié (le catalogue est consommé à la
// saisie d'un hébergement sur une fiche), mais les écritures sont réservées aux administrateurs :
// supprimer une option référencée met son `hostingOptionId` à NULL sur TOUS les hébergements de
// TOUTES les applications (FK `SET NULL`). `GlobalAdminManage` est une permission globale, donc
// résoluble sur une route sans `:applicationId`, contrairement à `HostingWrite` (par application).
// #2446 : ce catalogue étant transverse, il relève de l'administrateur global et non d'un
// administrateur de périmètre.
@UseGuards(PermissionGuard)
@Controller("hosting-options")
export class HostingOptionController {
  constructor(private readonly hostingOptionService: HostingOptionService) {}

  @Post()
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({ summary: "Create a new hosting option" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Hosting option created successfully",
    type: HostingOptionDto,
  })
  create(@Body() createHostingOptionDto: CreateHostingOptionDto) {
    return this.hostingOptionService.create(createHostingOptionDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all hosting options with optional filtering" })
  @ApiOkResponse({
    description: "Paginated list of hosting options",
    type: PaginatedResponseDto.of(HostingOptionDto),
  })
  findAll(@Query() filters: HostingOptionFiltersDto) {
    return this.hostingOptionService.findAllHostingOptions(filters);
  }

  @Patch(":id")
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({ summary: "Update hosting option by ID" })
  @ApiOkResponse({
    description: "Hosting option updated successfully",
    type: HostingOptionDto,
  })
  @ApiNotFoundResponse({ description: "Hosting option not found" })
  update(
    @Param("id") id: string,
    @Body() updateHostingOptionDto: UpdateHostingOptionDto,
  ) {
    return this.hostingOptionService.update(id, updateHostingOptionDto);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({ summary: "Delete hosting option by ID" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Hosting option deleted successfully",
  })
  @ApiNotFoundResponse({
    description: "Hosting option not found",
  })
  remove(@Param("id") id: string) {
    return this.hostingOptionService.delete(id);
  }
}
