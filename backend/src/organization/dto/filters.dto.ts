import { IsOptional, IsString } from 'class-validator';

export class OrganizationFilterDto {
  @IsOptional()
  @IsString()
  ids?: string;

  @IsOptional()
  @IsString()
  withChildren?: 'true' | 'false';

  @IsOptional()
  @IsString()
  withAncestors?: 'true' | 'false';

  @IsOptional()
  @IsString()
  search?: string;
}
