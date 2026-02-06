import { ApiPropertyOptional, PickType } from "@nestjs/swagger";
import { CreateTechnicalDebtInfoDto } from "src/technical-debt-info/dto/create-technical-debt-info.dto";
import { ApplicationDto } from "./get-application.dto";

export class TechnicalDebtPointDto extends PickType(ApplicationDto, [
  "id",
  "label",
  "shortName",
] as const) {
  @ApiPropertyOptional({
    type: () => CreateTechnicalDebtInfoDto,
    description: "Technical debt information for the application",
    nullable: true,
  })
  technicalDebtInfo?: CreateTechnicalDebtInfoDto | null;
}
