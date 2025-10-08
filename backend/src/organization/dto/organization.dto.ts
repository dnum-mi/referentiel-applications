import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class CreateOrganizationDto {
  @ApiProperty({
    example: "Direction de la transformation numérique",
    description: "Nom de l'organisation",
    required: true,
  })
  @IsString()
  path: string;

  @ApiProperty({
    example: "",
    description: "url de l'organisation",
    required: false,
  })
  @IsString()
  @IsOptional()
  url: string;

  @ApiProperty({
    example: "dtnum",
    description: "sigle de l'organisation",
    required: false,
  })
  @IsString()
  @IsOptional()
  sigle: string;

  @ApiProperty({
    example: "f09ed26a-8415-476a-be3b-ada479291c34",
    description: "L'identifiant de l'organisation parente",
    required: false,
  })
  @IsString()
  @IsOptional()
  parentId: string;
}

export class PatchOrganizationDto extends PartialType(CreateOrganizationDto) {}

export class OrganizationDto {
  @ApiProperty({
    example: "f09ed26a-8415-476a-be3b-ada479291c34",
    description: "L'identifiant de l'organisation",
  })
  id: string;

  @ApiProperty({
    example: "Direction de la transformation numérique",
    description: "Nom de l'organisation",
  })
  path: string;

  @ApiProperty({
    example: "",
    description: "url de l'organisation",
    nullable: true,
  })
  url: string | null;

  @ApiProperty({
    example: "dtnum",
    description: "sigle de l'organisation",
    nullable: true,
  })
  sigle: string | null;

  @ApiProperty({
    example: "f09ed26a-8415-476a-be3b-ada479291c34",
    description: "L'identifiant de l'organisation parente",
    nullable: true,
  })
  @IsString()
  parentId: string | null;
}
