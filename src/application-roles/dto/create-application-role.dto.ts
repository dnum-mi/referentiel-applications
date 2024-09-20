import { IsNotEmpty, IsString } from 'class-validator';

export class CreateApplicationRoleDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  role: string;
}
