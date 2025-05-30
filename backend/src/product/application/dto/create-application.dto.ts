import { priorityRestart } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty({
    example:
      'https://referentiel-applications.interieur.rie.gouv.fr/applications',
    description: 'Source of the label',
  })
  @IsString()
  source: string | null;

  @ApiProperty({ example: 'My Application', description: 'Value of the label' })
  @IsString()
  @IsOptional()
  value: string | null;

  @ApiProperty({
    example: 'short-app-name',
    description: 'ShortName of the label',
  })
  @IsString()
  @IsOptional()
  shortname: string | null;
}

export class CreateApplicationDto {
  @ApiProperty({
    example: 'My Application',
    description: 'Label of the application',
  })
  @IsString()
  label: string;

  @ApiProperty({
    example: 'short-app-name',
    description: 'Short name of the application',
    required: false,
  })
  @IsOptional()
  @IsString()
  shortName: string;

  @ApiProperty({
    example: 'http://example.com/logo.png',
    description: 'Logo URL of the application',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    example: 'An amazing application',
    description: 'Description of the application',
  })
  @IsString()
  description: string;

  @ApiProperty({
    type: [String],
    example: ['population 1', 'population 2'],
    description: 'population associated with the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  targetPopulations?: string[];

  @ApiProperty({ enum: priorityRestart, required: false })
  @IsOptional()
  @IsEnum(priorityRestart)
  priorityRestart?: priorityRestart;

  @ApiProperty({
    type: [String],
    example: ['finance', 'HR'],
    description: 'Purposes of the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  purposes?: string[];

  @ApiProperty({
    type: [String],
    example: ['tag1', 'tag2'],
    description: 'Tags associated with the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @Transform((value) =>
    value.forEach((element) => {
      return element.toUpperCase();
    }),
  )
  tags?: string[];

  @ApiProperty({
    example: 'parentApp123',
    description: 'Parent application ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({
    type: [CreateLabelDto],
    description: 'Liste des labels alternatifs associés à l’application',
    example: [
      {
        source:
          'https://referentiel-applications.interieur.rie.gouv.fr/applications',
        value: 'My App',
        shortname: 'short-name',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabelDto)
  labels: CreateLabelDto[];
}

export class PatchApplicationDto extends PartialType(CreateApplicationDto) {}
