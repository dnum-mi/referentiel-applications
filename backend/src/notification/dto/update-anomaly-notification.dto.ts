import { CreateAnomalyNotificationDto } from "./create-anomaly-notification.dto";
import { PartialType } from "@nestjs/swagger";

export class UpdateAnomalyNotificationDto extends PartialType(CreateAnomalyNotificationDto) {}
