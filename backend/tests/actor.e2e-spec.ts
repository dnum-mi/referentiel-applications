import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';

describe('Actor', () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };
  let TOKEN: string;

  it(`/GET actor`, async () => {
    user = await UserFaker.create(['read']);
    application = await ApplicationFaker.create(user);
    TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST actor`, async () => {
    user = await UserFaker.create(['write']);
    application = await ApplicationFaker.create(user);
    TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/actors`)
      .send({
        role: 'test',
        email: 'test@test.co',
        firstname: 'firstname',
        lastname: 'lastname',
        actorTypeId: '',
        organizationId: '',
        applicationId: application.id,
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });
});
