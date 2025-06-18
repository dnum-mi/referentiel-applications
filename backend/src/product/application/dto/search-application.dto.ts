import { priorityRestart } from '@prisma/client';

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
  IsEnum,
  IsIn,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Champ à utiliser pour le tri',
    example: 'label',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: "Ordre de tri : 'asc' ou 'desc'",
    example: 'asc',
  })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description:
      "Recherche sur tous les champs d'hébergement (site, plateforme, fournisseur, bâtiment, salle)",
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  hostingSearch?: string;

  @ApiPropertyOptional({
    description: "Colonnes à inclure dans l'export",
    example: '["id", "label", "shortName", "description"]',
    type: 'array',
    items: {
      type: 'string',
    },
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch (e) {
        // If not valid JSON, treat as comma-separated values
        return value.split(',').map((v) => v.trim());
      }
    }
    return Array.isArray(value) ? value : [value];
  })
  columns?: string[];
}

export class ListApplicationDto {
  @ApiPropertyOptional({
    description: 'Recherche globale (sur label, description, tags, shortName)',
    example: '',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Recherche label',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Recherche par shortName' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional({ description: 'Filtrer par tags (un ou plusieurs)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tag?: string[];

  @ApiPropertyOptional({
    description:
      'Filtrer par une ou plusieurs priorités de redémarrage (p0 à p5)',
    enum: priorityRestart,
    isArray: true,
    example: ['p1', 'p3'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(priorityRestart, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  priorityRestart?: priorityRestart[];

  @ApiPropertyOptional({
    description: 'Type d’acteur. Utiliser les valeurs de /actorTypes',
    example: '',
  })
  @IsOptional()
  @IsString()
  actorType?: string;

  @ApiPropertyOptional({
    description: 'Nom de l’organisation liée à l’application',
    example: 'Direction des systèmes d’information',
  })
  @IsOptional()
  @IsString()
  organizationLabel?: string;

  @ApiPropertyOptional({
    description:
      "Recherche unifiée sur tous les champs d'hébergement (site, plateforme, fournisseur, bâtiment, salle)",
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  hostingSearch?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par site d’hébergement ',
    example: 'LOGNES(SIL)',
  })
  @IsOptional()
  @IsString()
  hostingSite?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par plateforme d’hébergement',
    example: 'CLOUD PI NATIVE',
  })
  @IsOptional()
  @IsString()
  hostingPlatform?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par fournisseur d’hébergement',
    example: 'DTNUM',
  })
  @IsOptional()
  @IsString()
  hostingProvider?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par bâtiment d’hébergement',
    example: 'B21',
  })
  @IsOptional()
  @IsString()
  hostingBuilding?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par salle d’hébergement',
    example: 'IT5',
  })
  @IsOptional()
  @IsString()
  hostingRoom?: string;

  @ApiPropertyOptional({
    description: 'Recherche par lien (ressource externe)',
  })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: 'Numéro de page', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({
    description: 'Nombre de résultats par page',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Champ utilisé pour le tri',
    example: 'label',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Ordre de tri',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
