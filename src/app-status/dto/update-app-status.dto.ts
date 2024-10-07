import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional } from 'class-validator';

export class UpdateAppStatusDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  label?: string;
}
