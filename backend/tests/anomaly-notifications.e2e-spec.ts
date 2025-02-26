import request from 'supertest';
import { setupTestSuite } from './setup';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma/prisma.service';

const TOKEN =
  'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIwYXBzYjYxQzVFa2x6d2JjRUpXYXZPeXllMk5UQ29FRHpRb2lFdWFlTjJnIn0.eyJzdWIiOiI5OWZhNDE5ZS1mNGZiLTRlZDctOGIxMS1jNzIxMGIzMDkiLCAiZW1haWwiOiJ0aG9tYXMuYmVybmFyZC1lY29ub2NvbUBpbnRlcmlldXIuZ291di5mciJ9.';

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

  it(`/GET anomaly-notifications`, () => {
    const app = getApp();
    return request(app.getHttpServer())
      .get('/anomaly-notifications')
      .set('Authorization', TOKEN)
      .expect(200);
  });
});
