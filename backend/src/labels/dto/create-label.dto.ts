import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty({
    example:
      'https://referentiel-applications.interieur.rie.gouv.fr/applications',
    description: 'Source of the label',
  })
  @IsString()
  source: string | null;

  @ApiProperty({ example: 'My Application', description: 'Label of the label' })
  @IsString()
  @IsOptional()
  label: string | null;

  @ApiProperty({
    example: 'short-app-name',
    description: 'ShortName of the label',
  })
  @IsString()
  @IsOptional()
  shortname: string | null;
}
