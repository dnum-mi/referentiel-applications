import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { CreateLabelDto } from "./create-label.dto";

export class LabelDto extends CreateLabelDto {
  @ApiProperty({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID of the label",
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID of the application to which the label belongs",
  })
  @IsString()
  applicationId: string;
}
