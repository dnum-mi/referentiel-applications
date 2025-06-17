import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';

describe('Labels', () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
    application = await ApplicationFaker.create(user);
  });

  it(`/GET applications/:applicationId/labels`, async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/labels`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications/:applicationId/labels`, async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/labels`)
      .send({
        source: '',
        value: 'Test Application',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });
});
