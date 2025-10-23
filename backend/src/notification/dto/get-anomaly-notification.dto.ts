import { ApiProperty, PickType } from "@nestjs/swagger";
import { AnomalyNotificationStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { ApplicationDto } from "src/product/application/dto/get-application.dto";
import { UserEntity } from "src/user/entities/user.entity";

class Notifier extends PickType(UserEntity, ["id", "email"]) {}

export class GetAnomalyNotificationDto {
  @IsString()
  id: string;

  @IsString()
  applicationId: string | null;

  @ValidateNested()
  @Type(() => ApplicationDto)
  application: ApplicationDto | null;

  @IsString()
  notifierId: string;

  @ApiProperty({ type: Notifier, description: "The user who reported the issue" })
  notifier: Notifier;

  @IsString()
  description: string;

  @ApiProperty({
    description: "Le statut de la notification d'anomalie",
    enum: AnomalyNotificationStatus,
    required: true,
    enumName: "AnomalyNotificationStatus",
  })
  @IsString()
  status: AnomalyNotificationStatus;

  @IsString()
  @ApiProperty({
    description: "Date de création de la metadata",
    example: "2023-10-01T12:00:00Z",
    type: String,
  })
  createdAt: Date;

  @IsString()
  updatedAt: Date;
}
