import { ApiHideProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateActeurDto {
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiHideProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
