import { priorityRestart, Status } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty({
    example: 'CODE_PAI',
    description: 'Source of the label',
  })
  @IsString()
  @IsOptional()
  source: string | null;

  @ApiProperty({ example: 'My App', description: 'Value of the label' })
  @IsString()
  value: string | null;
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
  @Transform(({ value }) => value.map((v) => v.toUpperCase()))
  tags?: string[];

  @ApiProperty({
    enum: Status,
    description: 'Statut de cycle de vie (défaut under_construction)',
    required: false,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiProperty({
    type: [CreateLabelDto],
    description: 'Liste des labels alternatifs associés à l’application',
    example: [
      {
        source: '',
        value: 'My App',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabelDto)
  labels: CreateLabelDto[];
}

export class PatchApplicationDto extends PartialType(CreateApplicationDto) {}
