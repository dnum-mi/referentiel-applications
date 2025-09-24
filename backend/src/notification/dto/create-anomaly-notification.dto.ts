import { IsString, IsEnum, IsOptional } from "class-validator";
import { AnomalyNotificationStatus } from "@prisma/client";

export class CreateAnomalyNotificationDto {
  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsString()
  description: string;

  @IsEnum(AnomalyNotificationStatus)
  status?: AnomalyNotificationStatus;
}

export class CreateAnomalyNotificationRequestDto {
  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsString()
  description: string;
}
