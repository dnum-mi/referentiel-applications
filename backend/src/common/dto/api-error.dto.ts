import { ApiProperty } from "@nestjs/swagger";

/**
 * Enveloppe d'erreur produite par `AllExceptionsFilter` (#2292). Documentée dans le contrat pour
 * que les clients puissent s'appuyer sur `correlationId` et sur la forme de `message`, qui est un
 * tableau lorsque l'erreur vient de la validation des DTO.
 */
export class ApiErrorDto {
  @ApiProperty({ example: 409, description: "Statut HTTP de la réponse." })
  statusCode: number;

  @ApiProperty({
    example: "Un enregistrement avec les mêmes valeurs existe déjà.",
    description:
      "Message destiné à l'utilisateur. Tableau de messages pour les erreurs de validation.",
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  })
  message: string | string[];

  @ApiProperty({ example: "Conflict", description: "Libellé court du statut." })
  error: string;

  @ApiProperty({
    example: "1d4f2c8e-0b6a-4f51-9d0e-2a7c5b3e9f10",
    description:
      "Identifiant de corrélation, également renvoyé dans l'en-tête X-Correlation-ID.",
  })
  correlationId: string;

  @ApiProperty({
    example: "2026-09-24T09:12:33.481Z",
    description: "Date ISO 8601 de l'erreur.",
  })
  timestamp: string;

  @ApiProperty({
    example: "/api/v2/organizations/1",
    description: "Chemin de la requête à l'origine de l'erreur.",
  })
  path: string;
}
