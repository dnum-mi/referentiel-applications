import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";
import { PaginationDto } from "../../common/dto";

export class DataDescriptionFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Filtre par nom (recherche partielle, insensible à la casse)",
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateDataDescriptionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      "Familles de données parentes (une donnée peut appartenir à plusieurs familles)",
  })
  @IsOptional()
  @IsUUID("4", { each: true })
  familyIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  officialUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsUUID("4", { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      "Applications sources de cette donnée (celles qui la produisent sur RefApp)",
  })
  @IsOptional()
  @IsUUID("4", { each: true })
  applicationSourceIds?: string[];
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

  @ApiPropertyOptional({
    type: () => [DataFamilyDto],
    description:
      "Familles de données parentes (une donnée peut appartenir à plusieurs familles)",
  })
  @IsOptional()
  @IsArray()
  families?: DataFamilyDto[];

  @ApiPropertyOptional({ type: () => [TagDto] })
  @IsOptional()
  @IsArray()
  tags?: TagDto[];

  @ApiPropertyOptional({
    type: () => [ApplicationRefDto],
    description:
      "Applications sources de cette donnée (celles qui la produisent sur RefApp)",
  })
  @IsOptional()
  @IsArray()
  applicationsSource?: ApplicationRefDto[];

  @ApiPropertyOptional({ type: () => [DataApplicationRefDto] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  dataApplications?: DataApplicationRefDto[];
}
