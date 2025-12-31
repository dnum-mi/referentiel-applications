import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";
import { Tag } from "../entities/tag.entity";

export class CreateTagDto {
  @ApiProperty({
    description: "Nom unique du tag",
    example: "securite",
    required: true,
  })
  @MinLength(2, {
    message: "Le nom du tag doit contenir au moins 2 caractères.",
  })
  @MaxLength(128, {
    message: "Le nom du tag doit contenir au maximum 128 caractères.",
  })
  @IsString()
  name: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

export class TagDto {
  @ApiProperty({ description: "Identifiant unique du tag" })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Nom unique du tag",
    example: "securite",
    required: true,
  })
  @MinLength(2, {
    message: "Le nom du tag doit contenir au moins 2 caractères.",
  })
  @MaxLength(128, {
    message: "Le nom du tag doit contenir au maximum 128 caractères.",
  })
  @Matches(/^[a-z._-]+$/, {
    message:
      "Le nom du tag ne peut contenir que des minuscules, ou les caractères '.', '_' et '-'",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Date de création du tag",
    example: "2025-01-01T00:00:00.000Z",
    type: String,
  })
  @IsDateString()
  createdAt: Date;
}

export class TagFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Recherche sur le nom",
    example: "tag1",
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class TagsPaginatedResponseDto extends PaginatedResponseDto<Tag> {
  @ApiProperty({ type: [TagDto] })
  results: TagDto[];
}
