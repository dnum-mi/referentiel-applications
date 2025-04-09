import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';

export class CreateActorTypeDto {
  @ApiProperty({
    example: 'MOA',
    description: "Code du type d'acteur",
    required: true,
  })
  @IsString()
  @IsOptional()
  code: string;

  @ApiProperty({
    example: 'Maîtrise d’Ouvrage',
    description: "Libellé du type d'acteur",
    required: true,
  })
  @IsString()
  label: string;

  @ApiProperty({
    example:
      'La MOA définit les besoins du projet, supervise sa mise en œuvre et veille à ce que les objectifs métiers soient atteints.',
    description: "description du type d'acteur",
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string;
}

export class PatchActorTypeDto extends PartialType(CreateActorTypeDto) {
  @ApiHideProperty()
  @IsOptional()
  id: string;
}
