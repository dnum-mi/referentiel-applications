import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { APP_PERMISSIONS } from "src/common/utils/types";

export enum AdminLevel {
  NONE = 0,
  READ = 10,
  WRITE = 20,
  ADMIN = 30,
}

export class UserEntity {
  @IsString()
  keycloakId: string;

  @IsString()
  email: string;

  @IsNumber()
  @IsEnum(AdminLevel)
  adminLevel: AdminLevel; // Changed from permissions to adminLevel

  @IsString()
  @IsOptional()
  organizationId: string | null;

  @IsString()
  lastLogin: Date | null;
}

export class Requestor extends UserEntity {
  @IsArray()
  @IsOptional()
  groups?: string[];

  @IsArray()
  @IsOptional()
  appPerms?: APP_PERMISSIONS[]; // Changed from permissions to appPerms
}
