import { PartialType } from "@nestjs/swagger";
import { CreateAnomalyNotificationDto } from "./create-anomaly-notification.dto";

export class UpdateAnomalyNotificationDto extends PartialType(CreateAnomalyNotificationDto) {}
