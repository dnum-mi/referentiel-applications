import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";

export class CreateDataDescriptionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  officialUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsUUID("4", { each: true })
  tagIds?: string[];
}

export class DataFamilyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  path: string;
}

export class TagDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;
}

export class ApplicationRefDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  label: string;
}

export class DataApplicationRefDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  applicationId: string;

  @ApiProperty({ type: () => ApplicationRefDto })
  application: ApplicationRefDto;
}

export class DataDescriptionDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  officialUrl?: string;

  @ApiPropertyOptional({ type: () => DataFamilyDto })
  @IsOptional()
  family?: DataFamilyDto;

  @ApiPropertyOptional({ type: () => [TagDto] })
  @IsOptional()
  @IsArray()
  tags?: TagDto[];

  @ApiPropertyOptional({ type: () => [DataApplicationRefDto] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  dataApplications?: DataApplicationRefDto[];
}
