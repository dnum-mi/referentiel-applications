import { ApiProperty, ApiPropertyOptional, PickType } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { TokenStatus } from "../domain/token-status.entity";
import { Roles } from "@prisma/client";

export class TokenDto {
  @ApiProperty({
    example: "abc123def456ghi789jkl012mno345pq",
    description: "Identifiant unique du token",
    required: true,
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    required: false,
    enum: Roles,
    enumName: "Roles",
    description: "Role attribué a un utilisateur",
  })
  @IsOptional()
  @IsEnum(Roles)
  role?: Roles;

  @ApiProperty({
    example: "Token pour l'application X",
    description: "Description du token",
    required: true,
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: "Service X",
    description: "Nom du service ou de l'application utilisant le token",
    required: true,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: "2023-12-31T23:59:59.999Z",
    description:
      "Date d'expiration du token, au format ISO 8601, maximum 1 an dans le futur",
    required: true,
  })
  @IsDateString({ strict: true })
  expiresAt: string;

  @ApiProperty({
    example: "active",
    description: "Statut du token",
    required: true,
  })
  @IsEnum(TokenStatus)
  status: keyof typeof TokenStatus;
}

export class ExposedTokenDto extends TokenDto {
  @ApiProperty({
    example: "xyz987uvw654rst321opq098nml765kj",
    description:
      "Valeur du token (ne sera pas stockée, à afficher une seule fois)",
    required: true,
  })
  @IsString()
  password: string;
}

export class CreateServiceTokenDto extends PickType(TokenDto, [
  "name",
  "description",
  "expiresAt",
  "role",
] as const) {
  @ApiProperty({
    required: true,
    enum: Roles,
    enumName: "Roles",
    description: "Role attribué a un utilisateur",
  })
  role: Roles;
}

export class CreatePersonalTokenDto extends PickType(TokenDto, [
  "name",
  "description",
  "expiresAt",
  "role",
] as const) {
  @ApiProperty({
    required: false,
    enum: Roles,
    enumName: "Roles",
    description:
      "Niveau d'administration du token personnel (optionnel). Il ne pourra pas être supérieur à celui de l'utilisateur créant le token.",
  })
  @IsOptional()
  role?: Roles;
}

export class RegenerateTokenDto extends PickType(TokenDto, [
  "expiresAt",
] as const) {}
