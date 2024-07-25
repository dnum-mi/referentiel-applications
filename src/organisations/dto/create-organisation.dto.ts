import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrganisationDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  label: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(5)
  organisationcode: string;
}
