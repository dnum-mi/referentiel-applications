import { ApiProperty } from "@nestjs/swagger";
import type { AdminLevel } from "../entities/user.entity";

export class UpdateUserDto {
  @ApiProperty({ required: false })
  adminLevel?: AdminLevel;
}
