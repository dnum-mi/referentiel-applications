import { ApiProperty, ApiPropertyOptional, PickType } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";
import { AdminLevel } from "src/user/entities/user.entity";
import { TokenStatus } from "../domain/token-status.entity";

export class TokenDto {
  @ApiProperty({
    example: "abc123def456ghi789jkl012mno345pq",
    description: "Identifiant unique du token",
    required: true,
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    example: 10,
    description: "Niveau d'administration du token",
    required: false,
  })
  @IsOptional()
  @IsEnum(AdminLevel)
  adminLevel?: AdminLevel;

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
    description: "Date d'expiration du token, au format ISO 8601, maximum 1 an dans le futur",
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
    description: "Valeur du token (ne sera pas stockée, à afficher une seule fois)",
    required: true,
  })
  @IsString()
  password: string;
}

export class CreateServiceTokenDto extends PickType(TokenDto, [
  "name",
  "description",
  "expiresAt",
  "adminLevel",
] as const) {
  @ApiProperty({
    required: true,
  })
  adminLevel: AdminLevel;
}

export class CreatePersonalTokenDto extends PickType(TokenDto, [
  "name",
  "description",
  "expiresAt",
  "adminLevel",
] as const) {
  @ApiProperty({
    required: false,
    description: "Niveau d'administration du token personnel (optionnel). Il ne pourra pas être supérieur à celui de l'utilisateur créant le token.",
  })
  @IsOptional()
  adminLevel?: AdminLevel;
}

export class RegenerateTokenDto extends PickType(TokenDto, [
  "expiresAt",
] as const) {
}
