import { ApiProperty } from "@nestjs/swagger";
import { CapabilityNames } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
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

export enum AdminLevel {
  NONE = 0,
  READ = 10,
  WRITE = 20,
  ADMIN = 30,
}

export const UserCapabilities = {
  CreateApplication: "CreateApplication",
  CreateGlobalReport: "CreateGlobalReport",
  ExportData: "ExportData",
} as const satisfies {
  [capabilityName in CapabilityNames]: capabilityName;
};

export const UserType = {
  human: "human",
  bot: "bot",
} as const;

export class UserEntity {
  @IsString()
  id: string;

  @IsString()
  email: string;

  @IsNumber()
  @IsEnum(AdminLevel)
  adminLevel: AdminLevel; // Changed from permissions to adminLevel

  @ApiProperty({
    required: false,
    enum: UserCapabilities,
    enumName: "UserCapabilities",
    isArray: true,
    description: "Liste des capacités de l'utilisateur",
  })
  capabilities?: (keyof typeof UserCapabilities)[];

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
}

export class Requestor extends UserEntity {
  @IsArray()
  @IsOptional()
  groups?: string[];

  @IsArray()
  @IsOptional()
  appPerms?: APP_PERMISSIONS[]; // Changed from permissions to appPerms

  capabilities: (keyof typeof UserCapabilities)[];
}
