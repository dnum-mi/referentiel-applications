import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { UserType } from "../entities/user.entity";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class UserFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      "Type d'utilisateur. Utiliser les valeurs de UserType",
    enum: UserType,
    isArray: true,
    example: ["human"],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type?: (keyof typeof UserType)[];
}
