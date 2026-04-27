import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum SortByEnum {
  application = "application",
  status = "status",
  date = "date",
  description = "description",
  notifier = "notifier",
  notes = "notes",
}

enum OrderEnum {
  asc = "asc",
  desc = "desc",
}

export class ReportFiltersDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  @ApiProperty({
    description: "Filtrer les signalements pour l'utilisateur connecté",
    default: false,
  })
  all?: boolean;

  @IsOptional()
  @IsString()
  searchReport?: string;

  @IsOptional()
  @IsEnum(SortByEnum)
  sortBy?: SortByEnum;

  @IsOptional()
  @IsEnum(OrderEnum)
  order?: OrderEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
