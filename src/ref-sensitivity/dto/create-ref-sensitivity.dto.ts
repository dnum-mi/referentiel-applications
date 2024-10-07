import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRefSensitivityDto {
  @ApiProperty({
    description: 'The unique code for the sensitivity level',
    example: 'S1',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2)
  sensitivitycode: string;

  @ApiProperty({
    description: 'Label for the sensitivity level',
    example: 'Confidential',
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  label: string;
}
