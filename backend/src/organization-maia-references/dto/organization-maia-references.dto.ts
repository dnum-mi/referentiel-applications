import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateOrganizationMaiaReferenceDto {
  @ApiProperty({
    example: "MI/DNUM/SDID",
    description: "Référence MAIA à associer",
  })
  @IsString()
  maiaRef: string;

  @ApiProperty({
    example: "f09ed26a-8415-476a-be3b-ada479291c34",
    description: "Identifiant de l'organisation locale cible",
  })
  @IsString()
  organizationId: string;
}

export class OrganizationMaiaReferenceFilterDto {
  @ApiPropertyOptional({
    example: "f09ed26a-8415-476a-be3b-ada479291c34",
    description: "Filtrer par organisation locale",
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class OrganizationMaiaReferenceDto {
  @ApiProperty({
    example: "f09ed26a-8415-476a-be3b-ada479291c34",
    description: "Identifiant de la référence",
  })
  id: string;

  @ApiProperty({
    example: "MI/DNUM/SDID",
    description: "Référence MAIA",
  })
  maiaRef: string;

  @ApiProperty({
    example: "f09ed26a-8415-476a-be3b-ada479291c34",
    description: "Organisation locale liée",
  })
  organizationId: string;

  @ApiProperty({
    description: "Date de création",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Date de mise à jour",
  })
  updatedAt: Date;
}
