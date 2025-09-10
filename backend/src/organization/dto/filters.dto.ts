import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class OrganizationFilterDto {
  @IsOptional()
  @IsString()
  ids?: string;

  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description: "Renvoi les organisations enfants de chaque organisation",
    default: false,
  })
  @IsBoolean()
  withChildren?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description: "Renvoi les organisations parentes de chaque organisation",
    default: true,
  })
  @IsBoolean()
  withAncestors?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
