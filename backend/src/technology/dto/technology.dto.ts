import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTechnologyDto {
  @ApiProperty({
    example: "Node.js",
    description: "Nom de la technologie",
  })
  @IsString()
  technology: string;

  @ApiProperty({
    example: "20.11",
    description: "Version utilisée",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string | null;
}

export class TechnologyDto extends CreateTechnologyDto {
  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant unique de la technologie",
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant de l'application",
  })
  @IsString()
  applicationId: string;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-04-30",
    description:
      "Date de fin de support/vie de la version (source endoflife.date)",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  eolDate?: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-07-03T10:00:00.000Z",
    description: "Date de dernière vérification du statut de fin de vie",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  eolCheckedAt?: string | null;
}

export class TechnologyErrorResponseDto {
  @ApiProperty({
    example: "Cette technologie est déjà renseignée pour cette application",
    description: "Message d'erreur en cas de conflit",
  })
  @IsString()
  message: string;
}
