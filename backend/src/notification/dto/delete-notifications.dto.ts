import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class DeleteNotificationsDto {
  @ApiProperty({
    type: [String],
    description: "IDs des notifications à supprimer",
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
