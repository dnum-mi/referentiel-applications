import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class CreateDataFamilyDto {
  @ApiProperty({
    description: "Chemin hiérarchique de la famille",
    example: "Identité / Etat civil",
  })
  @IsString()
  @MaxLength(255)
  path: string;
}

export class UpdateDataFamilyDto extends PartialType(CreateDataFamilyDto) {}

export class DataFamilyFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Recherche sur le chemin" })
  @IsOptional()
  @IsString()
  path?: string;
}
