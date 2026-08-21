import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class BusinessDivisionFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Recherche sur le nom",
    example: "farm",
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateBusinessDivisionDto {
  @ApiProperty({
    description: "Nom unique du business division",
    example: "farm",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;
}

export class UpdateBusinessDivisionDto extends PartialType(
  CreateBusinessDivisionDto,
) {}

export class BusinessDivisionDTO extends CreateBusinessDivisionDto {
  @ApiProperty({ description: "Identifiant unique de la division DTO" })
  @IsString()
  id: string;
}
