import { ApiProperty } from "@nestjs/swagger";

export class SyncOrganizationsResponseDto {
  @ApiProperty({
    description: "Statut de la tâche de synchronisation",
    example: "queued",
    enum: ["queued"],
  })
  status: "queued";

  @ApiProperty({
    description: "Message descriptif",
    example: "Tâche de synchronisation MAIA lancée.",
  })
  message: string;
}
