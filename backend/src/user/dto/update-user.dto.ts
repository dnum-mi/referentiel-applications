import { ApiProperty } from "@nestjs/swagger";
import { Permission, Roles } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { OrganizationDto } from "src/organizations/dto/organizations.dto";

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
  @IsArray()
  additionalPermissions?: (keyof typeof Permission)[];

  @IsString()
  @IsOptional()
  scopeOrganizationId: string | null;

  @ApiProperty({ type: () => OrganizationDto, required: false })
  @IsOptional()
  scopeOrganization?: OrganizationDto | null;
}

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description:
      "Indique si les notifications par email sont activées pour l'utilisateur",
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}
