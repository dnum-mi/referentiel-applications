import { ApiHideProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { CreateActeurDto } from './create-acteur.dto';

export class UpdateActeurDto extends PartialType(CreateActeurDto) {
  @ApiHideProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiHideProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
