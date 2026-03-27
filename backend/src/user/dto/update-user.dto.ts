import { ApiProperty } from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
import type { AdminLevel } from "../entities/user.entity";

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsInt()
  adminLevel?: AdminLevel;

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
