import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { setupSwagger } from "../src/swagger-config";
import { getPrismaClient } from "./fakers/prisma";
import type { PrismaClient } from "@prisma/client";

export async function setupApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  setupSwagger(app, false);
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
