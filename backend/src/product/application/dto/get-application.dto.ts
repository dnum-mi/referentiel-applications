import { IsArray, IsString } from 'class-validator';

export class GetApplicationDto {
  @IsString()
  id: string;

  @IsString()
  logo: string;

  @IsString()
  description: string;

  @IsArray()
  purposes: string[];

  @IsArray()
  tags: string[];
}
