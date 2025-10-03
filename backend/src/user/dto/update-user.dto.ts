import { ApiProperty } from "@nestjs/swagger";
import type { AdminLevel } from "../entities/user.entity";
import { IsInt, IsOptional, IsString } from "class-validator";

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsInt()
  adminLevel?: AdminLevel;

  @ApiProperty({ required: false, description: "ID de l'organisation", nullable: true })
  @IsOptional()
  @IsString()
  organizationId?: string | null;
}
