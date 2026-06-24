import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import { PaginationDto } from "src/common/dto";

export class CreateActorDto {
  @ApiProperty({
    example: "example@example.com",
    description: "Email de l'acteur (Optionel)",
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.email !== "")
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: "Jean",
    description: "Prénom de l’acteur",
    required: false,
  })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiProperty({
    example: "Dupont",
    description: "Nom de l’acteur",
    required: false,
  })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiProperty({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID du type d'acteur lié",
    required: true,
  })
  @IsString()
  actorTypeId: string;

  @ApiProperty({
    example: "9965dc19-1c5a-472d-83e3-8bf65093c86c",
    description: "ID de l'organization lié (Optionel)",
    required: false,
  })
  @IsOptional()
  organizationId?: string | null;

  @ApiProperty({
    example: "035869dc-47a6-4cee-828f-f6a28d050b35",
    description: "ID de l'application lié (Optionel)",
    required: false,
  })
  @IsOptional()
  applicationId?: string | null;

  @ApiProperty({
    description: "Indique si l'acteur est un groupe d'acteurs ou non",
    required: false,
  })
  @IsBoolean()
  isGroup: boolean;
}

export class UpdateActorDto extends PartialType(CreateActorDto) {}

export class ActorDto extends CreateActorDto {
  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant unique de l'acteur",
    required: true,
  })
  @IsString()
  id: string;
}

export class ActorFiltersDto extends PaginationDto {
  @ApiProperty({
    example: "035869dc-47a6-4cee-828f-f6a28d050b35",
    description: "ID de l'application pour filtrer les acteurs",
    required: false,
  })
  @IsOptional()
  @IsString()
  applicationId?: string;
}

export class AdminActorFiltersDto extends PaginationDto {
  @ApiProperty({
    description: "Recherche par email, prénom, nom ou application",
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class BulkResultDto {
  @ApiProperty({ description: "Nombre d'acteurs affectés" })
  count: number;
}

export class ApplicationRefDto {
  @ApiProperty({ description: "ID de l'application" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Libellé de l'application" })
  @IsString()
  label: string;
}

export class BulkActorByEmailDto {
  @ApiProperty({
    example: "example@example.com",
    description: "Email des acteurs à cibler",
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Liste des IDs d'applications à cibler (toutes si vide)",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicationIds?: string[];
}

export class BulkUpdateActorByEmailDto extends UpdateActorDto {
  @ApiProperty({
    example: "example@example.com",
    description: "Email actuel des acteurs à cibler",
    required: true,
  })
  @IsEmail()
  targetEmail: string;

  @ApiProperty({
    description: "Liste des IDs d'applications à cibler (toutes si vide)",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicationIds?: string[];
}
