import { ApiProperty } from "@nestjs/swagger";
import { Permission, Roles } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { APP_PERMISSIONS } from "src/common/utils/types";
import { OrganizationDto } from "src/organizations/dto/organizations.dto";

export class UserFollowedApplicationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;
}

export const UserType = {
  human: "human",
  bot: "bot",
} as const;

export class UserEntity {
  @IsString()
  id: string;

  @IsString()
  email: string;

  @ApiProperty({
    required: true,
    enum: Roles,
    enumName: "Roles",
    description: "Role attribué a un utilisateur",
  })
  @IsEnum(Roles)
  role: Roles;

  @IsString()
  @IsOptional()
  organizationId: string | null;

  @ApiProperty({ type: () => OrganizationDto, required: false })
  @IsOptional()
  organization?: OrganizationDto | null;

  @IsString()
  lastLogin: Date | null;

  @ApiProperty({ enum: UserType, enumName: "UserType" })
  @IsString()
  @IsEnum(UserType)
  type: keyof typeof UserType;

  @ApiProperty({
    description: "Préférence de notification par email",
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  emailNotificationsEnabled?: boolean;

  @ApiProperty({
    description: "Applications suivies par l'utilisateur",
    required: false,
    type: () => [UserFollowedApplicationDto],
  })
  @IsOptional()
  followedApplications?: UserFollowedApplicationDto[];

  @ApiProperty({
    required: true,
    enum: Permission,
    enumName: "Permission",
    isArray: true,
    description: "Liste des permissions supplémentaire accordé a un user",
  })
  additionalPermissions: (keyof typeof Permission)[];
}

export class UserWithPermissions extends UserEntity {
  @ApiProperty({
    required: false,
    enum: Permission,
    enumName: "Permission",
    isArray: true,
    description: "Liste des permissions lié au role d'un user",
  })
  @IsOptional()
  permissions?: (keyof typeof Permission)[];
}

export class Requestor extends UserWithPermissions {
  @IsArray()
  @IsOptional()
  groups?: string[];

  @IsArray()
  @IsOptional()
  appPerms?: APP_PERMISSIONS[]; // Changed from permissions to appPerms
}
