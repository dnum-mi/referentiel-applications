import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ExternalRessourceType } from '@prisma/client';

export class CreateLinkDto {
  @IsString()
  link: string;

  @IsEnum(ExternalRessourceType)
  type: ExternalRessourceType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  applicationId?: string;
}
