import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateHostingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false, description: "ID of the hosting option" })
  @IsOptional()
  @IsString()
  hostingOptionId?: string;

  @ApiProperty()
  @IsUUID()
  applicationId: string;
}
