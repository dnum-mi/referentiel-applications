import { IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppTypeDto {
  @ApiPropertyOptional({
    example: 'Web Application',
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  label?: string;
}
