import { IsArray, IsOptional, IsString } from 'class-validator';

export class GetApplicationDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  shortName: string | null;

  @IsString()
  logo: string;

  @IsString()
  description: string;

  @IsArray()
  purposes: string[];

  @IsArray()
  tags: string[];

  @IsString()
  lifecycleId: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
