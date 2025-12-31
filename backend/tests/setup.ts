import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import type { PrismaClient } from "@prisma/client";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { setupGlobalValidation } from "../src/config/app-config";
import { setupSwagger } from "../src/swagger-config";
import { getPrismaClient } from "./fakers/prisma";

export async function setupApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Use the same validation configuration as the main app
  setupGlobalValidation(app);

  setupSwagger(
    app,
    {
      writeYaml: false,
      onlyWriteSwagger: false,
    },
    {
      baseUrl: process.env.KEYCLOAK_BASE_URL,
      realm: process.env.KEYCLOAK_REALM,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
    },
  );
  await app.init();
  return app;
}

export function setupTestSuite() {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await setupApp();
    prisma = getPrismaClient();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  return () => app;
}
