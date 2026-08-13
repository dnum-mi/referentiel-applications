import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto";
import { stringToBoolean } from "src/utils/functions";

export class ActorTypeFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    default: false,
    description:
      "Inclure le(s) type(s) d'acteur système (isDefault) dans la liste. Exclu par défaut : ces types ne sont pas assignables à un acteur réel (cf. matrice des permissions pour les manipuler).",
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  includeSystem?: boolean;
}
