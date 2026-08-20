import { ApiProperty } from "@nestjs/swagger";

export class SavedFilterDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: "Filtres de recherche d'applications sauvegardés",
    type: Object,
  })
  filters: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;
}
