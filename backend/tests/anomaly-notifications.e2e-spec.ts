import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { getPrismaClient } from './fakers/prisma';
import { AdminLevel } from 'src/user/entities/user.entity';

describe('Anomaly Notifications', () => {
  const getApp = setupTestSuite();
  const prisma = getPrismaClient();
  afterAll(async () => {
    prisma.$disconnect();
  });

  it(`/GET anomaly-notifications`, async () => {
    const app = getApp();
    const user = await UserFaker.create(AdminLevel.WRITE);
    const TOKEN = await getToken(user);
    return request(app.getHttpServer())
      .get('/anomaly-notifications')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
