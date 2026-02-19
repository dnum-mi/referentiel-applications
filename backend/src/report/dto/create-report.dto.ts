import { ApiProperty } from "@nestjs/swagger";
import { ReportStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateReportDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: "La description du signalement",
    required: false,
  })
  description: string;

  @IsOptional()
  @IsEnum(ReportStatus)
  @ApiProperty({
    description: "Le statut du signalement",
    enum: ReportStatus,
    required: false,
  })
  status?: ReportStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: "La note du signalement",
    required: false,
  })
  notes?: string;
}

export class CreateReportRequestDto {
  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  notes?: string = "";
}
