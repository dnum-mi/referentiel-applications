import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";
import {
  OpenDataStatus,
  DataUpdateFrequency as UpdateFrequency,
} from "@prisma/client";
import { DataDescriptionDto } from "./create-data-description.dto";

export { OpenDataStatus, UpdateFrequency };

export class CreateDataApplicationDto {
  @ApiProperty()
  @IsUUID()
  dataDescriptionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sensibilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  example?: string;

  @ApiPropertyOptional({ enum: OpenDataStatus, enumName: "OpenDataStatus" })
  @IsOptional()
  @IsEnum(OpenDataStatus)
  openDataStatus?: OpenDataStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReference?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessUsage?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  documentationUrl?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  volumetry?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyVolumetry?: number;

  @ApiPropertyOptional({ enum: UpdateFrequency, enumName: "UpdateFrequency" })
  @IsOptional()
  @IsEnum(UpdateFrequency)
  updateFrequency?: UpdateFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  conservation?: string;
}

export class DataSensibilityDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  color: string;
}

export class CreateDataExposureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  swaggerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authenticationType?: string;
}

export class DataExposureDto extends CreateDataExposureDto {
  @ApiProperty()
  @IsUUID()
  id: string;
}

export class DataApplicationDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  applicationId: string;

  @ApiProperty()
  @IsUUID()
  dataDescriptionId: string;

  @ApiProperty({ type: () => DataDescriptionDto })
  @IsUUID()
  dataDescription: DataDescriptionDto;

  @ApiPropertyOptional({ type: () => DataSensibilityDto })
  sensibility?: DataSensibilityDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  example?: string;

  @ApiPropertyOptional({ enum: OpenDataStatus, enumName: "OpenDataStatus" })
  @IsOptional()
  @IsEnum(OpenDataStatus)
  openDataStatus?: OpenDataStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReference?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessUsage?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  documentationUrl?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  volumetry?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyVolumetry?: number;

  @ApiPropertyOptional({ enum: UpdateFrequency, enumName: "UpdateFrequency" })
  @IsOptional()
  @IsEnum(UpdateFrequency)
  updateFrequency?: UpdateFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  conservation?: string;

  @ApiPropertyOptional({ type: () => [DataExposureDto] })
  @IsOptional()
  @IsArray()
  exposures?: DataExposureDto[];
}
