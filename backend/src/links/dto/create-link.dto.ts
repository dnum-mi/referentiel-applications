import { IsString, IsEnum, IsOptional } from "class-validator";
import { ExternalRessourceType } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class CreateLinkDto {
  @IsString()
  link: string;

  @IsEnum(ExternalRessourceType)
  @ApiProperty({ enum: ExternalRessourceType, description: "Type of the external resource", enumName: "ExternalRessourceType" })
  type: ExternalRessourceType;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;
}

export class LinkDto extends CreateLinkDto {
  @IsString()
  id: string;
}
