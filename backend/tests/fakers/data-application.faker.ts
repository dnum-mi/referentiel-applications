import { faker } from "@faker-js/faker";
import { DataUpdateFrequency, OpenDataStatus } from "@prisma/client";
import { getPrismaClient } from "./prisma";
import { DataExposureFaker } from "./data-exposure.faker";

const BUSINESS_USAGES = [
  "Utilisée pour l'identification des agents dans le portail RH.",
  "Consommée par le moteur de calcul de paie mensuelle.",
  "Nécessaire à la génération des bulletins de salaire dématérialisés.",
  "Alimentée par le référentiel national et synchronisée quotidiennement.",
  "Données critiques pour la gestion des droits d'accès au SI.",
  "Exposée via API REST aux applications clientes du SI.",
  "Utilisée dans les rapports de conformité RGPD trimestriels.",
  "Requise pour le calcul des indicateurs de performance RH.",
  "Source de vérité pour les adresses postales des usagers.",
  "Données transitant par le flux batch quotidien depuis le mainframe.",
];

const CONSERVATION_VALUES = [
  "1 an",
  "3 ans",
  "5 ans",
  "10 ans",
  "30 ans",
  "Durée de vie du contrat",
];

const DOCUMENTATION_URLS = [
  "https://confluence.intranet.gouv.fr/pages/data-rh",
  "https://wiki.si.gouv.fr/display/DATA/IdentiteCivile",
  "https://api.gouv.fr/documentation/api-donnees",
  "https://swagger.intranet.gouv.fr/api/v2/docs",
];

export class DataApplicationFaker {
  static async create(params: {
    applicationId: string;
    dataDescriptionId: string;
    sensibilityId?: string;
    exposureIds?: string[];
  }) {
    const prisma = getPrismaClient();

    const dataApp = await prisma.dataApplication.create({
      data: {
        applicationId: params.applicationId,
        dataDescriptionId: params.dataDescriptionId,
        sensibilityId: params.sensibilityId ?? null,

        isReference: faker.datatype.boolean({ probability: 0.2 }),
        openDataStatus: faker.helpers.arrayElement([
          OpenDataStatus.EXPOSED,
          OpenDataStatus.NOT_EXPOSED,
          OpenDataStatus.NOT_EXPOSABLE,
          OpenDataStatus.NOT_EXPOSED, // pondéré
          OpenDataStatus.NOT_EXPOSED,
        ]),
        updateFrequency: faker.helpers.arrayElement(
          Object.values(DataUpdateFrequency),
        ),
        businessUsage: faker.helpers.maybe(
          () => faker.helpers.arrayElement(BUSINESS_USAGES),
          { probability: 0.7 },
        ),
        example: faker.helpers.maybe(
          () =>
            JSON.stringify(
              {
                id: faker.string.uuid(),
                valeur: faker.lorem.word(),
                date: faker.date.recent().toISOString(),
              },
              null,
              2,
            ),
          { probability: 0.4 },
        ),
        conservation: faker.helpers.maybe(
          () => faker.helpers.arrayElement(CONSERVATION_VALUES),
          { probability: 0.6 },
        ),
        volumetry: faker.helpers.maybe(
          () => faker.number.int({ min: 100, max: 5_000_000 }),
          { probability: 0.5 },
        ),
        monthlyVolumetry: faker.helpers.maybe(
          () => faker.number.int({ min: 10, max: 50_000 }),
          { probability: 0.4 },
        ),
        documentationUrl:
          faker.helpers.maybe(
            () =>
              faker.helpers.arrayElements(DOCUMENTATION_URLS, {
                min: 1,
                max: 2,
              }),
            { probability: 0.5 },
          ) ?? [],

        exposures: params.exposureIds?.length
          ? { connect: params.exposureIds.map((id) => ({ id })) }
          : undefined,
      },
    });

    // Crée 0 à 2 exposures attachées à cette dataApplication
    const exposuresCount = faker.number.int({ min: 0, max: 2 });
    for (let i = 0; i < exposuresCount; i++) {
      await DataExposureFaker.create({ dataApplicationId: dataApp.id });
    }

    return dataApp;
  }
}
