import { PrismaClient } from "@prisma/client";
import { fakerFR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

export class FamilyFaker {
  static async create() {
    const families = [
      { label: "Matériels > Véhicules" },
      {
        label:
          "Titres / Documents administratifs,Matériels > Armes,Matériels > Véhicules,Matériels > Autres matériels",
      },
      {
        label:
          "Événements,Matériels > Véhicules,Titres / Documents administratifs",
      },
      { label: "Matériels > Véhicules,Titres / Documents administratifs" },
      {
        label:
          "Finance / Budget,Titres / Documents administratifs,Matériels > Véhiculese",
      },
      { label: "Personnes physiques > Données médicales,Événements" },
    ];

    const data = faker.helpers.arrayElement(families);

    return await prisma.family.upsert({
      where: { label: data.label },
      update: {},
      create: {
        label: data.label,
      },
    });
  }
}
