import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUrbanzoneDto {
  @IsOptional()
  @IsString()
  comments: string | null;

  @IsOptional()
  @IsUUID()
  parentid: string | null;

  @IsNotEmpty()
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description: string | null;
}
