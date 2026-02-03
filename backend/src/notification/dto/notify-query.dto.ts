import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { stringToBoolean } from "src/utils/functions";

export class UpdateAnomalyNotifyQuery {
  @ApiProperty({
    description: "Send Notification Email",
    example: "true",
  })
  @Transform(({ value }) => stringToBoolean(value))
  @IsOptional()
  @IsBoolean()
  notify: boolean;
}
