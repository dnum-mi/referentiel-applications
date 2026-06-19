import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { PaginationDto } from "src/common/dto";

export class CreateMditCampaignDto {
  @ApiProperty({
    description: "Année de la campagne (millésime)",
    example: 2027,
    minimum: 2000,
    maximum: 2100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({
    description: "Libellé optionnel de la campagne",
    example: "Campagne dette IT 2027",
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: "Campagne active (présentée dans le sélecteur)",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMditCampaignDto extends PartialType(CreateMditCampaignDto) {}

export class MditCampaignFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Ne retourner que les campagnes actives",
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyActive?: boolean;
}

export class MditCampaignDto extends CreateMditCampaignDto {
  @ApiProperty({
    description: "Identifiant unique de la campagne",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
  })
  @IsString()
  id: string;
}
