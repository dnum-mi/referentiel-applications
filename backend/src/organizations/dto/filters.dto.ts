import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { PaginationDto } from "src/common/dto";

export class OrganizationFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => value.split(",").filter((id) => id.trim() !== ""))
  ids?: string[];

  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description: "Renvoi les organisations enfants de chaque organisation",
    default: false,
  })
  @IsBoolean()
  withChildren?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description: "Renvoi les organisations parentes de chaque organisation",
    default: true,
  })
  @IsBoolean()
  withAncestors?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description:
      "Renvoi uniquement les organisations utilisées (qui ont des acteurs ou des utilisateurs)",
    default: false,
  })
  @IsBoolean()
  usedOnly?: boolean;

  @ApiPropertyOptional({
    description: "Nombre de résultats par page, 0 pour supprimer la pagination",
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pageSize?: number = 50;
}
