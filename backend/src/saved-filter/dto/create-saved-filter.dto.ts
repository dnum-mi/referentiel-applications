import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsString, MaxLength, MinLength } from "class-validator";

export class CreateSavedFilterDto {
  @ApiProperty({
    description: "Nom donné au filtre sauvegardé",
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description:
      "Filtres de recherche d'applications à sauvegarder (mêmes clés que la query de GET /applications)",
    type: Object,
  })
  @IsObject()
  filters: Record<string, unknown>;
}
