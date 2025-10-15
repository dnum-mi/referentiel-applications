import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { APP_PERMISSIONS } from "src/common/utils/types";
import { OrganizationDto } from "src/organization/dto/organization.dto";

export enum AdminLevel {
  NONE = 0,
  READ = 10,
  WRITE = 20,
  ADMIN = 30,
}

export const UserCapabilities = {
  CreateApplication: "CreateApplication",
} as const;

export const UserType = {
  human: "human",
  bot: "bot",
} as const;

export class UserEntity {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  keycloakId?: string;

  @IsString()
  email: string;

  @IsNumber()
  @IsEnum(AdminLevel)
  adminLevel: AdminLevel; // Changed from permissions to adminLevel

  @ApiProperty({ required: false, enum: UserCapabilities, enumName: "UserCapabilities", isArray: true, description: "Liste des capacités de l'utilisateur" })
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
}

export class Requestor extends UserEntity {
  @IsArray()
  @IsOptional()
  groups?: string[];

  @IsArray()
  @IsOptional()
  appPerms?: APP_PERMISSIONS[]; // Changed from permissions to appPerms
}
