import { priorityRestart } from '@prisma/client';
// src/application/dto/search-application.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsArray, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchApplicationDto {
  @ApiPropertyOptional({
    description: "Filtrer par lien d'application",
    example: 'https://example.com/',
  })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({
    description: "Filtrer par label ou shortname de l'application",
    example: 'Mon Application',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tag?: string[];

  @ApiPropertyOptional({
    description: 'Filtrer par priorité de redemarrage',
    example: 'tag:ref',
  })
  @IsOptional()
  priorityRestart?: priorityRestart;

  @ApiPropertyOptional({
    description: 'Numéro de la page pour la pagination',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number) // Transformation en nombre
  @IsNumber({}, { message: 'Le champ page doit être un nombre valide.' })
  @Min(0, { message: 'Le champ page doit être au moins 0.' })
  page?: number;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    example: 12,
  })
  @IsOptional()
  @Type(() => Number) // Transformation en nombre
  @IsNumber({}, { message: 'Le champ limit doit être un nombre valide.' })
  @Min(1, { message: 'Le champ limit doit être au moins 1.' })
  limit?: number;

  @IsOptional()
  @IsString()
  shortName?: string;
}
