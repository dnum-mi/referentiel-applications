import { ApiProperty } from "@nestjs/swagger";

export class EmailLogDto {
  @ApiProperty({ description: "ID unique de l'e-mail envoyé" })
  id: string;

  @ApiProperty({ description: "Destinataire(s) de l'e-mail" })
  to: string;

  @ApiProperty({ description: "Objet de l'e-mail" })
  subject: string;

  @ApiProperty({ description: "Contenu HTML complet de l'e-mail envoyé" })
  html: string;

  @ApiProperty({ description: "Contenu texte de l'e-mail envoyé" })
  text: string;

  @ApiProperty({ description: "Date et heure d'envoi" })
  sentAt: Date;
}
