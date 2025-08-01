import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

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
