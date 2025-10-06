import { IsString, IsOptional, IsEmail } from "class-validator";
import { ApiProperty, PartialType } from "@nestjs/swagger";

export class CreateActorDto {
  @ApiProperty({
    example: "example@example.com",
    description: "Email de l'acteur (Optionel)",
    required: false,
  })
  @IsEmail()
  @IsOptional()
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
  @IsOptional()
  @IsString()
  actorTypeId?: string;

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
