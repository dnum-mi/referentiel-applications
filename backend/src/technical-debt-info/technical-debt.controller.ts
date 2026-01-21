import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { User } from "src/common/decorators/user.decorator";
import { Requestor } from "src/user/entities/user.entity";
import { ApplicationSearchDto } from "src/product/application/dto/search-application.dto";
import { TechnicalDebtPointDto } from "src/product/application/dto/technical-debt-point.dto";
import { ApplicationService } from "src/product/application.service";

@ApiTags("technical-debts")
@Controller("technical-debts")
export class TechnicalDebtController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @ApiOperation({
    summary: "Lister les points de dette technique",
    description:
      "Retourne toutes les données de dette technique sans pagination, en appliquant les mêmes filtres que la recherche d'applications.",
  })
  @ApiOkResponse({
    description: "Liste des points de dette technique filtrés",
    type: TechnicalDebtPointDto,
    isArray: true,
  })
  async getTechnicalDebtPoints(
    @Query() searchParams: ApplicationSearchDto,
    @User() requestor: Requestor,
  ): Promise<TechnicalDebtPointDto[]> {
    return this.applicationService.getTechnicalDebtPoints(
      searchParams,
      requestor,
    );
  }
}
