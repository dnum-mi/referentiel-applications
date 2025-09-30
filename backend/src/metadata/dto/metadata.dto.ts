import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MetadataAction } from "@prisma/client";
import { PaginationDto } from "src/common/dto";
import { UserEntity } from "src/user/entities/user.entity";
import { IsOptional, IsDateString } from "class-validator";

export class MetadataFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Date de création minimum (inclusive)",
    example: "2023-01-01T00:00:00.000Z",
    type: String,
  })
  @IsOptional()
  @IsDateString()
  createdAtGte?: string;

  @ApiPropertyOptional({
    description: "Date de création maximum (inclusive)",
    example: "2023-12-31T23:59:59.999Z",
    type: String,
  })
  @IsOptional()
  @IsDateString()
  createdAtLte?: string;
}

export class ApplicationLightDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;
}

export class MetadataDto {
  @ApiProperty({
    description: "ID de la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
  })
  id: string;

  @ApiProperty({
    description: "ID de l'application liée",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
  })
  applicationId: string | null;

  @ApiProperty({
    description: "Action effectuée sur la metadata",
    example: MetadataAction.add,
    enum: MetadataAction,
    enumName: "MetadataAction",
  })
  action: MetadataAction;

  @ApiProperty({
    description: "ID de l'acteur lié à la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
  })
  actorId: string | null;

  @ApiProperty({
    description: "Date de création de la metadata",
    example: "2023-10-01T12:00:00Z",
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: "ID de la conformité liée à la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
  })
  complianceId: string | null;

  @ApiProperty({
    description: "ID de l'utilisateur qui a créé la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
  })
  createdById: string;

  @ApiProperty({
    description: "ID du propriétaire des données lié à la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
  })
  dataOwnerId: string | null;

  @ApiProperty({
    description: "Description de la metadata",
    example: "Initial metadata",
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: "ID de la ressource externe liée à la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
  })
  externalRessourceId: string | null;

  @ApiProperty({
    description: "ID de l'hébergement lié à la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
  })
  hostingId: string | null;

  @ApiProperty({
    description: "ID du label liée à la metadata",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    nullable: true,
  })
  labelId: string | null;

  @ApiProperty({ required: false, type: () => ApplicationLightDto })
  application?: ApplicationLightDto;

  @ApiProperty({
    description: "Utilisateur qui a créé la metadata",
    type: UserEntity,
  })
  createdBy: UserEntity;
}

export class FirstLastMetadataDto {
  @ApiProperty({
    description: "La première metadata de l'application",
    type: MetadataDto,
    nullable: true,
  })
  first: MetadataDto | null;

  @ApiProperty({
    description: "La dernière metadata de l'application",
    type: MetadataDto,
    nullable: true,
  })
  last: MetadataDto | null;
}
