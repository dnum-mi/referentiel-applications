import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class BusinessDivisionFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Recherche sur le nom",
    example: "farm",
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;
}

export class BusinessDivisionDTO {
  @ApiProperty({ description: "Identifiant unique de la division DTO" })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Nom unique du business division",
    example: "farm",
    required: true,
  })
  @IsString()
  label: string;
}
