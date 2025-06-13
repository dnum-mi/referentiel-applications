import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty({
    example: 'My Application',
    description: 'Source of the label',
  })
  @IsString()
  @IsOptional()
  source: string | null;

  @ApiProperty({
    example: 'short-app-name',
    description: 'Value of the label',
  })
  @IsString()
  @IsOptional()
  value: string;
}
