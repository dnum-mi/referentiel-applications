import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { Status } from '@prisma/client';

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

  @IsEnum(Status)
  status?: Status;

  @IsString()
  description: string;

  @IsArray()
  purposes: string[];

  @IsArray()
  tags: string[];

  @IsNumber()
  quality: number | null;
}
