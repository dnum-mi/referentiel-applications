import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @IsOptional()
  @IsDateString()
  start?: Date;

  @IsOptional()
  @IsDateString()
  end?: Date;

  @IsEnum(EventType)
  type: EventType;

  @IsString()
  description: string;

  @IsString()
  applicationId: string;
}
