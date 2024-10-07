import { IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRefSensitivityDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  label?: string;
}
