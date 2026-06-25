import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, Max, Min } from "class-validator";

export class CreateTechnicalDebtInfoDto {
  @ApiProperty({
    example: 3.2,
    description: "Technical maturity score (1-5). Omit / null = not rated.",
    required: false,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  technicalMaturity?: number;

  @ApiProperty({
    example: 4.5,
    description: "Business maturity score (1-5). Omit / null = not rated.",
    required: false,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  businessMaturity?: number;

  @ApiProperty({
    example: 2.75,
    description: "Cost containment score (1-5). Omit / null = not rated.",
    required: false,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  costContainment?: number;

  @ApiProperty({
    example: 2026,
    description:
      "Millésime (année) de la campagne dette IT. Par défaut, l'année courante.",
    required: false,
    minimum: 2000,
    maximum: 2100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  millesime?: number;
}

export class TechnicalDebtInfoDto extends CreateTechnicalDebtInfoDto {
  @ApiProperty({
    example: "uuid-example",
    description: "Unique identifier",
  })
  id: string;

  @ApiProperty({
    example: "uuid-example",
    description: "Application ID",
  })
  applicationId: string;
}
