import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateActorTypeDto {
  @ApiProperty({
    example: "MOA",
    description: "Code du type d'acteur",
    required: true,
  })
  @IsString()
  @IsOptional()
  code: string;

  @ApiProperty({
    example: "Maîtrise d’Ouvrage",
    description: "Libellé du type d'acteur",
    required: true,
  })
  @IsString()
  label: string;

  @ApiProperty({
    example:
      "La MOA définit les besoins du projet, supervise sa mise en œuvre et veille à ce que les objectifs métiers soient atteints.",
    description: "description du type d'acteur",
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string;
}

export class PatchActorTypeDto extends PartialType(CreateActorTypeDto) {}
export class ActorTypeDto extends CreateActorTypeDto {
  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant unique du type d'acteur",
    required: true,
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: false,
    description:
      "Type d'acteur système représentant les droits par défaut d'un utilisateur non-acteur. Non assignable à un acteur réel : à exclure des sélecteurs de création/édition d'acteur.",
  })
  @IsBoolean()
  isDefault: boolean;
}
