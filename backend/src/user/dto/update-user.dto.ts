import type { AdminLevel } from "../entities/user.entity";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { UserCapabilities } from "../entities/user.entity";

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsInt()
  adminLevel?: AdminLevel;

  @ApiProperty({
    required: false,
    enum: UserCapabilities,
    isArray: true,

    description: "Liste des capacités de l'utilisateur",
  })
  @IsArray()
  capabilities?: (keyof typeof UserCapabilities)[];

  @ApiProperty({ required: false, description: "ID de l'organisation", nullable: true })
  @IsOptional()
  @IsString()
  organizationId?: string | null;
}

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description: "Indique si les notifications par email sont activées pour l'utilisateur",
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}
