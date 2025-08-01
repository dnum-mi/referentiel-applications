import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsEnum, IsString, IsNumber, Min } from "class-validator";

export enum SortByEnum {
  application = "application",
  status = "status",
  date = "date",
  description = "description",
  signalant = "signalant",
}

enum OrderEnum {
  asc = "asc",
  desc = "desc",
}

export class AnomalyFiltersDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  @ApiProperty({
    description: "Filtrer les notifications d'anomalies pour l'utilisateur connecté",
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
