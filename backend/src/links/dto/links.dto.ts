import { ApiProperty, PartialType } from "@nestjs/swagger";
import { ExternalRessourceType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";

export class CreateLinkDto {
  @IsString()
  @ApiProperty({ description: "The URL of the link" })
  link: string;

  @IsEnum(ExternalRessourceType)
  @ApiProperty({
    enum: ExternalRessourceType,
    description: "Type of the external resource",
    enumName: "ExternalRessourceType",
  })
  type: ExternalRessourceType;

  @IsString()
  @IsOptional()
  @ApiProperty({
    required: false,
    description: "Optional description of the link",
  })
  description?: string;
}

export class UpdateLinkDto extends PartialType(CreateLinkDto) {}

export class LinkDto {
  @ApiProperty({ description: "Unique identifier of the link" })
  id: string;

  @ApiProperty({ description: "The URL of the link" })
  link: string;

  @ApiProperty({
    enum: ExternalRessourceType,
    description: "Type of the external resource",
  })
  type: ExternalRessourceType;

  @ApiProperty({ description: "Description of the link", required: false })
  description?: string;
}

export class LinkFiltersDto extends PaginationDto {}

export class LinksPaginatedResponseDto extends PaginatedResponseDto<LinkDto> {
  @ApiProperty({ type: [LinkDto], description: "Array of links" })
  results: LinkDto[];
}
