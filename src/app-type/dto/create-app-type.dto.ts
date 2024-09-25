import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppTypeDto {
  @ApiProperty({
    description: 'The unique code for the application type',
    example: 'APP01',
    minLength: 5,
    maxLength: 5,
  })
  @IsString()
  @Length(5, 5)
  applicationtypecode: string;

  @ApiProperty({
    description: 'Label for the application type',
    example: 'Mobile Application',
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  label: string;
}
