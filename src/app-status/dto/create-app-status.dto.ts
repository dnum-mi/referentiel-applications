import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateAppStatusDto {
  @ApiProperty({
    description: 'The unique code for the application status',
    example: 'ACT',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  applicationstatuscode: string;

  @IsString()
  @Length(1, 100)
  label: string;
}
