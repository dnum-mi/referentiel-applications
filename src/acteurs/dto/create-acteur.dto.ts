import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateActeurDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
