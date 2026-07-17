import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

// Noms de données réalistes pour un SI ministériel
const DATA_NAMES = [
  "Identité civile",
  "Coordonnées postales",
  "Adresse email professionnelle",
  "Numéro de téléphone",
  "Numéro de sécurité sociale (NIR)",
  "Données de paie",
  "Bulletin de salaire",
  "Solde de congés",
  "Habilitations et droits d'accès",
  "Journal d'audit",
  "Données bancaires (IBAN/BIC)",
  "Dossier de demande de prestation",
  "Historique des connexions",
  "Données de formation",
  "Évaluations annuelles",
  "Organigramme",
  "Données de conformité RGPD",
  "Contentieux en cours",
  "Indicateurs RH",
  "Données géographiques (adresse)",
  "Référentiel des codes INSEE",
  "Données budgétaires",
  "Factures fournisseurs",
  "Marchés publics",
  "Données techniques API",
  "Configuration serveur",
  "Logs applicatifs",
  "Données de cartographie SI",
  "Tableau de bord direction",
  "Statistiques d'usage",
];

const OFFICIAL_URLS = [
  "https://www.data.gouv.fr/fr/datasets/base-sirene",
  "https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=SireneV3",
  "https://www.data.gouv.fr/fr/datasets/code-officiel-geographique-cog",
  "https://geo.api.gouv.fr/",
  "https://api.gouv.fr/les-api/api-entreprise",
  null,
  null,
  null, // la majorité n'a pas d'URL officielle publique
];

export class DataDescriptionFaker {
  static async create(
    params: {
      name?: string;
      description?: string;
      familyId?: string;
      tagIds?: string[];
      officialUrl?: string | null;
      applicationSourceIds?: string[];
    } = {},
  ) {
    const prisma = getPrismaClient();

    return prisma.dataDescription.create({
      data: {
        name:
          params.name ??
          faker.helpers.arrayElement(DATA_NAMES) +
            ` (${faker.word.adjective()})`,
        description:
          params.description ??
          faker.helpers.arrayElement([
            faker.lorem.sentence(),
            `Données relatives aux ${faker.word.noun()}s utilisées dans le cadre de la gestion ${faker.word.noun()}.`,
            `Référentiel ${faker.word.noun()} alimenté par les systèmes métier et mis à disposition des applications consommatrices.`,
            null,
          ]),
        familyId: params.familyId ?? null,
        officialUrl:
          "officialUrl" in params
            ? params.officialUrl
            : faker.helpers.arrayElement(OFFICIAL_URLS),
        applicationsSource: params.applicationSourceIds?.length
          ? { connect: params.applicationSourceIds.map((id) => ({ id })) }
          : undefined,
        tags: params.tagIds?.length
          ? { connect: params.tagIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  static pickRandom<T>(items: T[], size: number): T[] {
    return faker.helpers.arrayElements(items, size);
  }
}
