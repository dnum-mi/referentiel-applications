import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class LabelDto {
  @ApiProperty({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID de la source du label",
  })
  @IsString()
  @IsOptional()
  labelSourceId?: string;

  @ApiProperty({
    example: "short-app-name",
    description: "Value of the label",
  })
  @IsString()
  value: string;

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
