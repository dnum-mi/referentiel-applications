import { CreateAnomalyNotificationDto } from "./create-anomaly-notification.dto";
import { OmitType, PartialType } from "@nestjs/swagger";

export class UpdateAnomalyNotificationDto extends PartialType(
  OmitType(
    CreateAnomalyNotificationDto,
    ["applicationId"] as const,
  ),
) {}
