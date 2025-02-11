import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AnomalyNotificationStatus } from '@prisma/client';

export class CreateAnomalyNotificationDto {
  @IsString()
  applicationId: string;

  @IsString()
  notifierId: string;

  @IsString()
  description: string;

  @IsEnum(AnomalyNotificationStatus)
  status?: AnomalyNotificationStatus;
}

export class CreateAnomalyNotificationRequestDto {
  @IsString()
  applicationId: string;

  @IsString()
  description: string;

  @IsEnum(AnomalyNotificationStatus)
  status: AnomalyNotificationStatus;
}
