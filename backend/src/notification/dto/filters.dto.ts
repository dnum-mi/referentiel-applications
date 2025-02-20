import { IsOptional, IsString } from 'class-validator';

export class FiltersDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;
}
