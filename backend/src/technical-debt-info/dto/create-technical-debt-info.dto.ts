import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateTechnicalDebtInfoDto {
  @ApiProperty({
    example: 3,
    description: "Technical maturity score (0-5)",
    required: false,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  technicalMaturity?: number;

  @ApiProperty({
    example: 4,
    description: "Business maturity score (0-5)",
    required: false,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  businessMaturity?: number;

  @ApiProperty({
    example: 2,
    description: "Cost maturity score (0-5)",
    required: false,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  costMaturity?: number;
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
