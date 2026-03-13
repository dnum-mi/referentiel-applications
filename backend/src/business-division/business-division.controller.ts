import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AppAction } from "src/common/decorators/application.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { BusinessDivisionService } from "./business-division.service";
import {
  BusinessDivisionDTO,
  BusinessDivisionFiltersDto,
} from "./dto/business-division.dto";

@ApiTags("Business Division")
@UseGuards(ApplicationGuard)
@Controller("business-division")
export class BusinessDivisionController {
  constructor(
    private readonly businessDivisionService: BusinessDivisionService,
  ) {}

  @Get()
  @AppAction("readBase")
  @ApiOperation({
    summary: "Rechercher des Business division.",
    description: `
    Cette route permet de rechercher selon les paramètres fournis :
  
    - Retourne une liste paginée ou non de business division.
    - Filtrage possible par nom.
    - Tri possible par :
      - \`label\`
    - Ordre : \`asc\` ou \`desc\`.
  `,
  })
  @ApiOkResponse({
    description: "Liste des tags trouvés",
    type: PaginatedResponseDto.of(BusinessDivisionDTO),
  })
  async findAll(@Query() filters: BusinessDivisionFiltersDto) {
    return await this.businessDivisionService.search(filters);
  }

  @Get(":id")
  @AppAction("readBase")
  @ApiOperation({
    summary: "Rechercher un Business division par id.",
  })
  @ApiOkResponse({
    description: "Business division",
    type: BusinessDivisionDTO,
  })
  @ApiNotFoundResponse({ description: "Business Division non trouvé" })
  @ApiParam({ name: "id", description: "ID du Business Division à trouver" })
  async findById(@Param("id") id: string) {
    return await this.businessDivisionService.findById(id);
  }
}
