import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class CreateDataSensibilityDto {
  @ApiProperty({
    description: "Libellé du niveau de sensibilité",
    example: "Sensible",
  })
  @IsString()
  @MaxLength(255)
  label: string;

  @ApiProperty({
    description: "Couleur hexadécimale associée",
    example: "#ce0500",
  })
  @IsString()
  @MaxLength(50)
  color: string;
}

export class UpdateDataSensibilityDto extends PartialType(
  CreateDataSensibilityDto,
) {}

export class DataSensibilityFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Recherche sur le libellé" })
  @IsOptional()
  @IsString()
  label?: string;
}
