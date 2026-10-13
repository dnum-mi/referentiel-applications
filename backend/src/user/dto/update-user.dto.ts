import { ApiProperty } from "@nestjs/swagger";
import { Permission, Roles } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  ValidateIf,
} from "class-validator";
import { OrganizationDto } from "src/organizations/dto/organizations.dto";
import { DELEGABLE_PERMISSIONS } from "src/permissions/role-to-permissions";

export class UpdateUserDto {
  @ApiProperty({
    required: false,
    enum: Roles,
    enumName: "Roles",
    description: "Role attribué a un utilisateur",
  })
  @IsOptional()
  @IsEnum(Roles)
  role?: Roles;

  @ApiProperty({
    required: false,
    description: "ID de l'organisation",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  organizationId?: string | null;

  @ApiProperty({
    required: true,
    enum: Permission,
    enumName: "Permission",
    isArray: true,
    description: "Liste des permissions supplémentaire accordé a un user",
  })
  // #2498 : seules les permissions déléguables sont acceptées (liste fermée), jamais
  // AdminPanelManage/GlobalAdminManage ni une permission applicative — sinon un contributeur
  // délégué pourrait être promu super-administrateur de fait.
  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsIn(DELEGABLE_PERMISSIONS, {
    each: true,
    message: `additionalPermissions ne peut contenir que des permissions déléguables (${DELEGABLE_PERMISSIONS.join(", ")})`,
  })
  additionalPermissions?: (keyof typeof Permission)[];

  @IsString()
  @IsOptional()
  scopeOrganizationId: string | null;

  @ApiProperty({ type: () => OrganizationDto, required: false })
  @IsOptional()
  scopeOrganization?: OrganizationDto | null;
}

/// Identifiant de document Grist (ou son urlId) : lettres, chiffres, tirets et soulignés.
export const GRIST_DOC_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
export const GRIST_DOC_IDS_MAX = 20;

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description:
      "Indique si les notifications par email sont activées pour l'utilisateur",
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiProperty({
    required: false,
    isArray: true,
    type: String,
    description:
      "Identifiants des documents Grist synchronisés depuis la recherche (remplace la liste)",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GRIST_DOC_IDS_MAX)
  @IsString({ each: true })
  @Matches(GRIST_DOC_ID_PATTERN, {
    each: true,
    message: "gristDocIds ne contient que des identifiants de document Grist",
  })
  gristDocIds?: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description:
      "Instance Grist des documents synchronisés, en HTTPS (seule l'origine est conservée). null l'efface.",
  })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUrl(
    { protocols: ["https"], require_protocol: true },
    { message: "gristUrl doit être une URL HTTPS" },
  )
  gristUrl?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description:
      "Clé d'API Grist de l'utilisateur. Écriture seule : elle n'est jamais renvoyée. null l'efface.",
  })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  @Length(1, 256)
  @Matches(/^\S+$/, { message: "gristApiKey ne contient pas d'espaces" })
  gristApiKey?: string | null;
}
