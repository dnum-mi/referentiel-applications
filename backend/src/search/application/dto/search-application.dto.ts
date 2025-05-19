import { priorityRestart } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchApplicationDto {
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
