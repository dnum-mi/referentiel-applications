import { PartialType } from '@nestjs/mapped-types';
import { CreateAnomalyNotificationDto } from './create-anomaly-notification.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnomalyNotificationStatus } from '@prisma/client';

export class UpdateAnomalyNotificationDto extends PartialType(
  CreateAnomalyNotificationDto,
) {
  @IsOptional()
  @IsEnum(AnomalyNotificationStatus)
  @ApiProperty({
    description: "Le nouveau statut de la notification d'anomalie",
    enum: AnomalyNotificationStatus,
    required: true,
  })
  status?: AnomalyNotificationStatus;
}
