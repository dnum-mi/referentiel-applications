import { ApiProperty, ApiPropertyOptional, PickType } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { OrganizationDto } from "src/organizations/dto/organizations.dto";
import { TokenStatus } from "../domain/token-status.entity";
import { Roles } from "@prisma/client";

export const TokenKind = {
  personal: "personal",
  service: "service",
} as const;

export class TokenOwnerDto {
  @ApiProperty({
    example: "abc123def456ghi789jkl012mno345pq",
    description: "Identifiant de l'utilisateur",
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: "jean.dupont@beta.gouv.fr",
    description: "Email de l'utilisateur",
  })
  @IsString()
  email: string;
}

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

  @ApiProperty({
    example: "personal",
    enum: TokenKind,
    enumName: "TokenKind",
    description:
      "Type de token : personnel (créé par un utilisateur pour lui-même) ou applicatif (compte de service pour un système tiers)",
  })
  @IsEnum(TokenKind)
  kind: keyof typeof TokenKind;

  @ApiProperty({
    type: TokenOwnerDto,
    description: "Utilisateur ayant créé le token",
  })
  createdBy: TokenOwnerDto;

  @ApiPropertyOptional({
    type: TokenOwnerDto,
    description:
      "Utilisateur usurpé par le token (le propriétaire pour un token personnel)",
  })
  @IsOptional()
  userImpersonate?: TokenOwnerDto;

  @ApiPropertyOptional({
    type: () => OrganizationDto,
    description:
      "Organisation de périmètre du compte de service usurpé par ce token (tokens applicatifs uniquement)",
  })
  @IsOptional()
  scopeOrganization?: OrganizationDto | null;
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

  @ApiPropertyOptional({
    required: false,
    nullable: true,
    description:
      "ID de l'organisation de périmètre du compte de service créé. Ignoré si le rôle est VISITOR, comme pour le périmètre d'un utilisateur.",
  })
  @IsOptional()
  @IsString()
  scopeOrganizationId?: string | null;
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
