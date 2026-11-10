import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { GRIST_COLUMN_FIELDS } from "src/grist/grist-columns";

export class ExportApplicationViewDto {
  @ApiProperty({
    type: [String],
    enum: GRIST_COLUMN_FIELDS,
    enumName: "GristColumnField",
    description: "Colonnes du tableau dans leur ordre d’affichage.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(GRIST_COLUMN_FIELDS, { each: true })
  columns: string[];

  @ApiPropertyOptional({
    description: "Chemin relatif du catalogue avec les filtres à rouvrir.",
    example: "/recherche-application?label=Catalogue",
  })
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  @Matches(/^\/(?!\/)[^\\\r\n]*$/)
  cataloguePath?: string;
}
