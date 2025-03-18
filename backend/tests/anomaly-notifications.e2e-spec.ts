import request from 'supertest';
import { setupTestSuite } from './setup';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma/prisma.service';
import { getToken } from './getToken';

describe('Anomaly Notifications', () => {
  const getApp = setupTestSuite();
  const keycloakId = uuidv4();

  beforeAll(async () => {
    const prismaService = new PrismaService();
    await prismaService.user.create({
      data: {
        email: `${keycloakId}@test.fr`,
        keycloakId: keycloakId,
      },
    });
  });

  it(`/GET anomaly-notifications`, async () => {
    const app = getApp();
    const TOKEN = await getToken();
    return request(app.getHttpServer())
      .get('/anomaly-notifications')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
