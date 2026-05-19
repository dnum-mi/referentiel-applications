import { getPrismaClient } from "./prisma";

// Les 4 niveaux de sensibilité fixes avec couleurs DSFR
const SENSIBILITIES = [
  { label: "Sensible", color: "#ce0500" }, // rouge DSFR error
  { label: "Rgpd", color: "#0063CB" }, // bleu DSFR info
];

export class DataSensibilityFaker {
  /** Crée les 4 niveaux de sensibilité (idempotent) et retourne la liste complète. */
  static async createAll() {
    const prisma = getPrismaClient();
    const results = [];
    for (const s of SENSIBILITIES) {
      const existing = await prisma.dataSensibility.findFirst({
        where: { label: s.label },
      });
      if (existing) {
        results.push(existing);
      } else {
        results.push(await prisma.dataSensibility.create({ data: s }));
      }
    }
    return results;
  }
}
