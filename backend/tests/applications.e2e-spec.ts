import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { faker } from '@faker-js/faker';

describe('Applications', () => {
  const app = setupTestSuite();
  let user: { keycloakId: string };
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
    TOKEN = await getToken(user);
  });

  it(`/GET applications`, async () => {
    await request(app().getHttpServer())
      .get('/applications')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/GET applications/search`, async () => {
    await request(app().getHttpServer())
      .get('/applications/search')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications`, async () => {
    await request(app().getHttpServer())
      .post('/applications')
      .send({
        label: faker.company.name(),
        shortName: 'complete-app',
        description: faker.company.catchPhrase(),
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
            userId: user.keycloakId,
          },
        ],
        compliances: [],
        externals: [],
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });
});
