import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "src/common/dto";

// Saisie depuis l'écran d'administration : les espaces parasites créeraient des quasi-doublons
// dans le catalogue, et un champ optionnel vidé doit effacer la valeur (null) plutôt que
// stocker une chaîne vide.
const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const trimToNull = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || null : value;

export class CreateHostingOptionDto {
  @ApiProperty({
    description: "Site name (géographique)",
    example: "CER(RENNES)",
  })
  @Transform(trim)
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  site: string;

  @ApiProperty({
    description: "Platform name",
    example: "PHYSIQUE",
  })
  @Transform(trim)
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  platform: string;

  @ApiProperty({
    description: "Provider name",
    example: "DTNUM",
  })
  @Transform(trim)
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  provider: string;

  @ApiProperty({
    description: "Building (optional)",
    example: "B15",
    required: false,
    nullable: true,
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  building?: string | null;

  @ApiProperty({
    description: "Room (optional)",
    example: "IT2",
    required: false,
    nullable: true,
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string | null;
}

export class UpdateHostingOptionDto extends CreateHostingOptionDto {}

export class HostingOptionFiltersDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description:
      "Recherche dans le fournisseur, la plateforme, le site, le bâtiment et la pièce",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  room?: string;
}

export class HostingOptionDto extends CreateHostingOptionDto {
  @ApiProperty({
    description: "Unique identifier of the hosting option",
    example: "12345678-1234-1234-1234-123456789012",
  })
  @IsString()
  id: string;
}

export class HostingOptionWithUsageDto extends HostingOptionDto {
  @ApiProperty({
    description:
      "Nombre d'hébergements d'applications rattachés à cette option (détachés en cas de suppression)",
    example: 3,
  })
  hostingsCount: number;
}
