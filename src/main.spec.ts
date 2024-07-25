import { INestApplication } from '@nestjs/common';
import { setupTestModule, teardownTestModule } from './test-setup';

import { PrismaService } from './prisma/prisma.service';

describe('Main Entry', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();
  });

  afterAll(async () => await teardownTestModule(app));

  describe('database connection', () => {
    it('should use env file to connect to postgres', async () => {
      const dataSource = app.get<PrismaService>(PrismaService);

      const isClientConnected: any =
        await dataSource.$queryRaw`SELECT 1 as result`;
      expect(isClientConnected[0].result).toEqual(1);
    });
  });
});
