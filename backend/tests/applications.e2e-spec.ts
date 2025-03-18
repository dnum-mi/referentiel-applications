import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { setupTestSuite } from './setup';
import { PrismaService } from 'src/prisma/prisma.service';
import { getToken } from './getToken';

describe('Applications', () => {
  const app = setupTestSuite();
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

  it(`/GET applications`, async () => {
    const TOKEN = await getToken();
    return request(app().getHttpServer())
      .get('/applications')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/GET applications/search`, async () => {
    const TOKEN = await getToken();
    return request(app().getHttpServer())
      .get('/applications/search')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications`, async () => {
    const TOKEN = await getToken();
    return request(app().getHttpServer())
      .post('/applications')
      .send({
        label: 'My Complete Application',
        shortName: 'complete-app',
        description:
          'A comprehensive application example with all data filled.',
        purposes: ['finance', 'HR', 'operations'],
        tags: ['tag1', 'tag2', 'tag3'],
        parentId: null,
        lifecycle: {
          status: 'in_production',
          firstProductionDate: '2025-01-06T10:34:25.061Z',
          plannedDecommissioningDate: '2030-12-31T23:59:59.000Z',
        },
        actors: [
          {
            role: 'dev',
            userId: keycloakId,
          },
        ],
        compliances: [],
        externals: [],
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });
});
