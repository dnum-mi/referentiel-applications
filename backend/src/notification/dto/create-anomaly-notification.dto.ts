import { IsString, IsEnum, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { AnomalyNotificationStatus } from "@prisma/client";

export class CreateAnomalyNotificationDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: "La description de la notification d'anomalie",
    required: false,
  })
  description: string;

  @IsOptional()
  @IsEnum(AnomalyNotificationStatus)
  @ApiProperty({
    description: "Le statut de la notification d'anomalie",
    enum: AnomalyNotificationStatus,
    required: false,
  })
  status?: AnomalyNotificationStatus;
}

export class CreateAnomalyNotificationRequestDto {
  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsString()
  description: string;
}
