import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { getPrismaClient } from './fakers/prisma';

describe('Stats', () => {
  const app = setupTestSuite();
  let user: { keycloakId: string };
  let TOKEN: string;
  let createdApplicationId: string;

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
    TOKEN = await getToken(user);
  });

  it('/POST stats - should compute and store IQ average', async () => {
    const response = await request(app().getHttpServer())
      .post('/stats')
      .send({
        applicationId: createdApplicationId,
        iq: 85,
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body).toHaveProperty('valeur');
    expect(response.body.valeur).toBeGreaterThanOrEqual(0);
  });

  it('/GET stats - should return stats for last 6 months', async () => {
    const response = await request(app().getHttpServer())
      .get('/stats')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    response.body.forEach(stat => {
      expect(stat).toHaveProperty('date');
      expect(stat).toHaveProperty('valeur');
    });
  });

});