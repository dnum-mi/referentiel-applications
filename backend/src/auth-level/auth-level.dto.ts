import { ApiProperty } from "@nestjs/swagger";
import { AuthLevel } from "@prisma/client";
import { AUTH_LEVEL_REASONS, AuthLevelReason } from "./auth-level";

/**
 * Niveau d'authentification de la session courante (#1985), exposé sur `/users/me` dès que le
 * mode n'est pas `off`. Volontairement minimal : ni la valeur brute du claim, ni le fournisseur,
 * ni le rôle, les permissions ou le périmètre d'origine — un attaquant tenant un mot de passe
 * n'a pas à connaître le profil de privilèges de sa victime, pas même son rôle. Le front se
 * contente de « vos droits sont ceux d'un utilisateur standard » ; le détail va au journal serveur.
 */
export class AuthLevelDto {
  @ApiProperty({
    enum: AuthLevel,
    enumName: "AuthLevel",
    description:
      "strong = carte agent ou double authentification ; weak = mode reconnu comme faible ; unknown = claim absent ou fournisseur non listé",
  })
  level: AuthLevel;

  @ApiProperty({
    description:
      "Vrai si les droits de la session ont été ramenés à ceux d'un utilisateur standard (mode enforce uniquement)",
  })
  downgraded: boolean;

  @ApiProperty({
    enum: [...AUTH_LEVEL_REASONS],
    enumName: "AuthLevelReason",
    description: "Motif du niveau attribué",
  })
  reason: AuthLevelReason;
}
