import { ApiProperty } from "@nestjs/swagger";
import type { AdminLevel } from "../entities/user.entity";
import { IsInt } from "class-validator";

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsInt()
  adminLevel?: AdminLevel;
}
