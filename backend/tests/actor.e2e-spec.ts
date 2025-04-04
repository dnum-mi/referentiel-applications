import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';

describe('Actor', () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create();
    application = await ApplicationFaker.create(user);
  });

  it(`/GET actor`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST actor`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/actors`)
      .send({
        role: 'test',
        email: 'test@test.co',
        firstname: 'firstname',
        lastname: 'lastname',
        type: 'Autre',
        organizationId: '',
        applicationId: application.id,
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });
});
