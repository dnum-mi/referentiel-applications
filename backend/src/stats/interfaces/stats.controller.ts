import { Controller, Get, Query } from "@nestjs/common";
import { StatsService } from "../application/stats.service";
import { GroupBy } from "./types/stats-entry.type";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { GetIqAvgGroupedDto } from "../application/dto/get-iq-avg-grouped.dto";

@ApiTags("Stats")
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("iq-avg/period")
  @ApiOperation({
    summary: "Récupérer la moyenne des IQ par période",
    description: `
Permet de récupérer la moyenne des IQ par période.  
Vous pouvez spécifier la période en utilisant les paramètres \`from\` et \`to\`,  
ainsi que le regroupement souhaité avec \`groupBy\`.  

**Valeurs possibles pour \`groupBy\` :**  
- \`jour\` (day)  
- \`semaine\` (week)  
- \`mois\` (month)  
- \`année\` (year)  

**Exemple d’appel :**  
\`\`\`http
GET /stats/iq-avg/period?from=2025-07-01&to=2025-07-23&groupBy=mois
Authorization: Bearer <TOKEN>
\`\`\`
    `,
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "Date de début au format ISO (ex. 2025-07-01)",
    example: "2025-07-01",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "Date de fin au format ISO (ex. 2025-07-23)",
    example: "2025-07-23",
  })
  @ApiQuery({
    name: "groupBy",
    required: false,
    description: "Regroupement souhaité (jour, semaine, mois, année)",
    enum: ["jour", "semaine", "mois", "année"],
    example: "mois",
  })
  @ApiOkResponse({
    description: "Tableau de buckets avec label, moyenne, min, max, count",
    type: GetIqAvgGroupedDto,
    isArray: true,
  })
  async getIqAvgGrouped(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("groupBy") groupBy?: GroupBy,
  ) {
    return this.statsService.getIqAvgGrouped(
      from && new Date(from),
      to && new Date(to),
      groupBy,
    );
  }
}
