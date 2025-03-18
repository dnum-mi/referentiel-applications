import request from 'supertest';
import { setupTestSuite } from './setup';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma/prisma.service';
import { getToken } from './getToken';

describe('Events', () => {
  const app = setupTestSuite();
  const keycloakId = uuidv4();
  const applicationId = uuidv4();

  beforeAll(async () => {
    const prismaService = new PrismaService();
    await prismaService.user.create({
      data: {
        email: `${keycloakId}@test.fr`,
        keycloakId: keycloakId,
      },
    });
    await prismaService.application.create({
      data: {
        id: applicationId,
        label: 'Test Application',
        description: 'Test Application Description',
        owner: {
          connect: {
            keycloakId: keycloakId,
          },
        },
        metadata: {
          create: {
            createdById: keycloakId,
            updatedById: keycloakId,
          },
        },
      },
    });
  });

  it(`/GET applications/:applicationId/events`, async () => {
    const TOKEN = await getToken();
    return request(app().getHttpServer())
      .get(`/applications/${applicationId}/events`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
