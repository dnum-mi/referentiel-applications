import { PartialType } from "@nestjs/swagger";
import { CreateTechnicalDebtInfoDto } from "./create-technical-debt-info.dto";

export class UpdateTechnicalDebtInfoDto extends PartialType(CreateTechnicalDebtInfoDto) {}
