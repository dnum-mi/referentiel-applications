import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { TechnologyEolSource } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from "class-validator";
import { EOL_STATUSES, type EolStatus } from "../utils/eol-status";

export class CreateTechnologyDto {
  @ApiProperty({
    example: "Base de données",
    description: "Famille / catégorie de technologie",
  })
  // #2527 : vide ou démesuré partait en 500 (colonne VarChar) ; 100 caractères suffisent à
  // n'importe quel libellé de famille ou de produit.
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: "technology ne peut pas être composé uniquement d'espaces",
  })
  @MaxLength(100)
  technology: string;

  @ApiProperty({
    example: "PostgreSQL",
    description: "Produit concret (sert à résoudre la fin de vie)",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: "product ne peut pas être composé uniquement d'espaces",
  })
  @MaxLength(100)
  product: string;

  @ApiProperty({
    example: "20.11",
    description: "Version utilisée",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string | null;

  @ApiProperty({
    example: "https://www.postgresql.org/docs/",
    description: "Lien documentaire (URL) associé au produit",
    required: false,
    nullable: true,
  })
  @IsOptional()
  // #2527 : schéma obligatoire — « www.exemple.fr » passait puis donnait un lien relatif cassé.
  @IsUrl({ require_protocol: true, protocols: ["http", "https"] })
  @MaxLength(2048)
  docUrl?: string | null;

  // Chaîne AAAA-MM-JJ (pas de `format: date`, qui ferait typer le champ `Date` côté client
  // généré alors que le formulaire envoie la valeur brute d'un `<input type="date">`).
  @ApiProperty({
    type: String,
    example: "2027-06-30",
    description:
      "Date de fin de vie saisie à la main (AAAA-MM-JJ), réservée aux cas où endoflife.date ne peut pas répondre (produit non suivi, service injoignable). Elle prime sur le calcul automatique, qui ne l'écrase jamais. `null` efface la saisie et rend la main à l'automatique ; absent = fin de vie inchangée.",
    required: false,
    nullable: true,
  })
  // Le format annoncé est imposé : `IsDateString` seul accepte des formes ISO 8601
  // (« 2027-W10 », « 2027-100 ») que `new Date()` ne lit pas, ce qui finirait en 500,
  // et `strict` refuse les dates calendaires impossibles (« 2027-02-30 »).
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "manualEolDate doit être au format AAAA-MM-JJ",
  })
  @IsDateString({ strict: true })
  manualEolDate?: string | null;
}

// `manualEolDate` est une commande d'écriture, pas une colonne : la lecture expose
// `eolDate` et son origine `eolSource`.
/**
 * #2527 : `PATCH :id` acceptait le DTO de création, technologie et produit obligatoires — une
 * mise à jour partielle (version seule, effacement de la date manuelle) était refusée en 400.
 */
export class UpdateTechnologyDto extends PartialType(CreateTechnologyDto) {}

export class TechnologyDto extends OmitType(CreateTechnologyDto, [
  "manualEolDate",
] as const) {
  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant unique de la technologie",
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant de l'application",
  })
  @IsString()
  applicationId: string;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-04-30",
    description:
      "Date de fin de support/vie de la version (source endoflife.date)",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  eolDate?: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-07-03T10:00:00.000Z",
    description: "Date de dernière vérification du statut de fin de vie",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  eolCheckedAt?: string | null;

  @ApiProperty({
    example: "postgresql",
    description:
      "Slug produit endoflife.date résolu (null + eolCheckedAt renseigné = produit non suivi par endoflife.date)",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  eolProduct?: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-10-20",
    description:
      "Date de fin de support actif de la version (source endoflife.date)",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  eoasDate?: string | null;

  @ApiProperty({
    example: "20.19.5",
    description:
      "Dernière version publiée du cycle correspondant (source endoflife.date)",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  latestVersion?: string | null;

  @ApiProperty({
    example: "20",
    description:
      "Nom du cycle endoflife.date apparié à la version (null si le produit n'est pas suivi, si la version ne désigne aucun cycle connu, ou si la ligne n'a jamais été vérifiée)",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  eolCycle?: string | null;

  @ApiProperty({
    enum: TechnologyEolSource,
    enumName: "TechnologyEolSource",
    example: TechnologyEolSource.endoflife,
    description:
      "Origine de la fin de vie : `endoflife` = calculée via endoflife.date (rafraîchie par TTL et par le cron), `manual` = saisie à la main, jamais recalculée automatiquement",
  })
  @IsEnum(TechnologyEolSource)
  eolSource: TechnologyEolSource;

  @ApiProperty({
    description:
      "Statut de fin de vie calculé par le backend à la lecture (#2527) : « eol » dépassée, « eol-soon » dans moins de 6 mois, « eoas-passed » hors support actif, null sinon. Source unique, le front ne le recalcule pas.",
    enum: EOL_STATUSES,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(EOL_STATUSES)
  eolStatus?: EolStatus | null;
}

export class EolProductDto {
  @ApiProperty({
    example: "nodejs",
    description: "Slug produit endoflife.date",
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: "Node.js",
    description: "Libellé d'affichage du produit",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  label?: string | null;

  @ApiProperty({
    example: "database",
    description: "Catégorie du produit",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiProperty({
    example: ["node"],
    description: "Alias reconnus pour ce produit",
    type: [String],
  })
  aliases: string[];
}

export class TechnologyErrorResponseDto {
  @ApiProperty({
    example: "Cette technologie est déjà renseignée pour cette application",
    description: "Message d'erreur en cas de conflit",
  })
  @IsString()
  message: string;
}
