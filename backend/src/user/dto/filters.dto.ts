import { IsOptional, IsString } from 'class-validator';

export class UserFilterDto {
  @IsOptional()
  @IsString()
  search?: string;
}
