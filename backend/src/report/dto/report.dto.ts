import { ApiProperty, PickType } from "@nestjs/swagger";
import { ReportStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsString } from "class-validator";
import { ApplicationDto } from "src/applications/dto/get-application.dto";
import { UserEntity } from "src/user/entities/user.entity";

class Notifier extends PickType(UserEntity, ["id", "email"]) {}

export class ReportDto {
  @IsString()
  id: string;

  @IsString()
  applicationId: string | null;

  @Type(() => ApplicationDto)
  application: ApplicationDto | null;

  @IsString()
  notifierId: string;

  @ApiProperty({
    type: Notifier,
    description: "The user who reported the issue",
  })
  notifier: Notifier;

  @ApiProperty({
    description:
      "ID de l'administrateur réel si le signalement a été créé sous impersonation",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
    required: false,
  })
  impersonatorId?: string | null;

  @ApiProperty({
    type: Notifier,
    description:
      "Administrateur réel si le signalement a été créé sous impersonation",
    nullable: true,
    required: false,
  })
  impersonator?: Notifier | null;

  @IsString()
  description: string;

  @ApiProperty({
    description: "Le statut du signalement",
    enum: ReportStatus,
    required: true,
    enumName: "ReportStatus",
  })
  @IsString()
  status: ReportStatus;

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
