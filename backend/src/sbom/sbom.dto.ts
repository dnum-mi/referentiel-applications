import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PreviewSbomDto {
  @ApiProperty({ maxLength: 160 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sourceName: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectVersion?: string;
}

export class SoftwareComponentsQueryDto {
  @ApiPropertyOptional({
    type: Number,
    default: 0,
    minimum: 0,
    maximum: 1_000_000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  page = 0;

  @ApiPropertyOptional({ type: Number, default: 15, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 15;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class UpdateSbomSourceDto {
  @ApiProperty({ description: "État désiré de la source" })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ description: "Révision affichée lors de la prévisualisation" })
  @IsInt()
  @Min(0)
  revision: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}
