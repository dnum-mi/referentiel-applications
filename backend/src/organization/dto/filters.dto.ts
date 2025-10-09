import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class OrganizationFilterDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.split(",").filter(id => id.trim() !== ""))
  ids?: string[];

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

  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description: "Renvoi uniquement les organisations utilisées (qui ont des acteurs ou des utilisateurs)",
    default: false,
  })
  @IsBoolean()
  usedOnly?: boolean;
}
