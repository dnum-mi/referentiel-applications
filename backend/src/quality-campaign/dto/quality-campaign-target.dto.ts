import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class QualityCampaignTargetQueryDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page: number = 0;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 15;

  @ApiPropertyOptional({
    enum: ["positive", "stable_or_declining", "not_comparable"],
  })
  @IsOptional()
  @IsIn(["positive", "stable_or_declining", "not_comparable"])
  progression?: "positive" | "stable_or_declining" | "not_comparable";

  @ApiPropertyOptional({
    enum: ["label", "iqAtStart", "iqCurrent", "delta"],
    default: "delta",
  })
  @IsOptional()
  @IsIn(["label", "iqAtStart", "iqCurrent", "delta"])
  sortBy?: "label" | "iqAtStart" | "iqCurrent" | "delta";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "asc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  order: "asc" | "desc" = "asc";
}

export class QualityCampaignTargetDto {
  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ type: Number, nullable: true })
  iqAtStart: number | null;

  @ApiProperty({ type: Number, nullable: true })
  iqCurrent: number | null;

  @ApiProperty({ type: Number, nullable: true })
  delta: number | null;
}
