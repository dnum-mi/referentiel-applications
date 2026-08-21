import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NotificationType } from "@prisma/client";

export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType, enumName: "NotificationType" })
  type: NotificationType;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  link?: string | null;

  @ApiPropertyOptional()
  applicationId?: string | null;

  @ApiPropertyOptional({
    description:
      "ID de l'e-mail envoyé pour ce même événement, si applicable : cliquer sur la notification affiche son contenu plutôt que de rediriger",
  })
  emailLogId?: string | null;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
}
