import { ApiProperty } from "@nestjs/swagger";
import { AuthLevel } from "@prisma/client";

/**
 * Une connexion journalisée (#1985) : une ligne par utilisateur, par jour et par contexte
 * d'authentification. Sert au diagnostic en administration pendant la phase d'observation
 * (« j'ai ma carte agent et le référentiel ne la voit pas ») puis en exploitation.
 */
export class UserConnexionLogDto {
  @ApiProperty({ description: "ID unique de l'entrée" })
  id: string;

  @ApiProperty({ description: "Jour de connexion (UTC)" })
  authTime: Date;

  @ApiProperty({
    enum: AuthLevel,
    enumName: "AuthLevel",
    description:
      "Niveau d'authentification évalué : strong, weak ou unknown (claim absent, fournisseur non listé ou évaluation désactivée)",
  })
  authLevel: AuthLevel;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Valeur brute du claim de mode d'authentification transmis par le fournisseur d'identité",
  })
  authMethod: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Fournisseur d'identité d'origine, si transmis",
  })
  authIdp: string | null;

  @ApiProperty({
    type: String,
    required: false,
    nullable: true,
    enum: ["token", "userinfo", null],
    description:
      "Source des claims : jeton d'accès ou userinfo ; null pour une source inconnue",
  })
  authSource: string | null;
}
