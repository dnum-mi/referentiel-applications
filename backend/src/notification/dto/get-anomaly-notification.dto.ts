import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplicationDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  ownerId: string;
}

export class GetAnomalyNotificationDto {
  @IsString()
  id: string;

  @IsString()
  applicationId: string;

  @ValidateNested()
  @Type(() => ApplicationDto)
  application: ApplicationDto;

  @IsString()
  notifierId: string;

  @IsString()
  description: string;

  @IsString()
  status: string;

  @IsString()
  createdAt: Date;

  @IsString()
  updatedAt: Date;
}
