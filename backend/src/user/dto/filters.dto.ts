import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto";
import { UserType } from "../entities/user.entity";

export class UserFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Type d'utilisateur. Utiliser les valeurs de /userTypes",
    enum: UserType,
    isArray: true,
    example: ["human"],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type: (keyof typeof UserType)[] = [UserType.human];
}
