import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';

describe('Events', () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create();
    application = await ApplicationFaker.create(user);
  });

  it(`/GET applications/:applicationId/events`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/events`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications/:applicationId/events`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/events`)
      .send({
        type: 'under_construction',
        description: 'Application is under construction',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });
});
