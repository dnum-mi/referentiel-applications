import { ApiProperty } from "@nestjs/swagger";
import { AnomalyNotificationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

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

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: "La note de la notification d'anomalie",
    required: false,
  })
  notes?: string;
}

export class CreateAnomalyNotificationRequestDto {
  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  notes?: string = "";
}
