import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

// Chemins hiérarchiques réalistes pour un SI ministériel
const FAMILY_PATHS = [
  "Gestion RH > Données Personnelles",
  "Gestion RH > Paie et Rémunération",
  "Gestion RH > Formation et Compétences",
  "Gestion RH > Temps et Absences",
  "Gestion Financière > Comptabilité",
  "Gestion Financière > Facturation",
  "Gestion Financière > Budget et Prévision",
  "Gestion Financière > Dépenses et Remboursements",
  "Usagers et Citoyens > Identité",
  "Usagers et Citoyens > Coordonnées",
  "Usagers et Citoyens > Demandes et Dossiers",
  "Usagers et Citoyens > Droits et Prestations",
  "Sécurité et Accès > Habilitations",
  "Sécurité et Accès > Journaux d'audit",
  "Sécurité et Accès > Authentification",
  "Patrimoine Applicatif > Référentiels Techniques",
  "Patrimoine Applicatif > Interfaces et API",
  "Patrimoine Applicatif > Configurations",
  "Données Géographiques > Adresses",
  "Données Géographiques > Territoires",
  "Statistiques et Reporting > Indicateurs Métier",
  "Statistiques et Reporting > Tableaux de Bord",
  "Juridique et Conformité > RGPD",
  "Juridique et Conformité > Contentieux",
];

export class DataFamilyFaker {
  static async create(params: { path?: string } = {}) {
    const prisma = getPrismaClient();
    return prisma.dataFamily.create({
      data: { path: params.path ?? faker.helpers.arrayElement(FAMILY_PATHS) },
    });
  }

  /** Crée une entrée par chemin (idempotent via findFirst) et retourne toutes les familles. */
  static async createAll() {
    const prisma = getPrismaClient();
    const results = [];
    for (const path of FAMILY_PATHS) {
      const existing = await prisma.dataFamily.findFirst({ where: { path } });
      if (existing) {
        results.push(existing);
      } else {
        results.push(await prisma.dataFamily.create({ data: { path } }));
      }
    }
    return results;
  }

  static pickRandom<T>(items: T[], size: number): T[] {
    return faker.helpers.arrayElements(items, size);
  }
}
