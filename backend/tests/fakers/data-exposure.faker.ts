import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

const EXPOSURE_TYPES = [
  "API REST",
  "Export fichier",
  "Flux batch",
  "Websocket",
  "Base partagée",
];
const FORMATS = ["JSON", "CSV", "XML", "Parquet", "PDF", "XLSX"];
const AUTH_TYPES = ["Bearer JWT", "API Key", "OAuth2", "Aucune", "mTLS"];

export class DataExposureFaker {
  static async create(params: { dataApplicationId: string }) {
    const prisma = getPrismaClient();

    const type = faker.helpers.arrayElement(EXPOSURE_TYPES);
    const isApi = type === "API REST";

    return prisma.dataExposure.create({
      data: {
        applicationDataId: params.dataApplicationId,
        type,
        format: faker.helpers.arrayElement(FORMATS),
        endpoint: isApi
          ? `/api/v${faker.number.int({ min: 1, max: 3 })}/${faker.word.noun().toLowerCase()}s`
          : null,
        url: faker.internet.url(),
        authenticationType: isApi
          ? faker.helpers.arrayElement(AUTH_TYPES)
          : null,
        swaggerUrl: isApi ? `${faker.internet.url()}/swagger` : null,
      },
    });
  }
}
