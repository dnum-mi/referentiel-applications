import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class AnomalyFiltersDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @ApiProperty({
    description: "Filtrer les notifications d'anomalies pour l'utilisateur connecté",
    default: false,
  })
  all?: boolean;
}
