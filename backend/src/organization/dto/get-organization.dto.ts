import { IsString, IsOptional } from 'class-validator';

export class GetOrganizationDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  sigle?: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
