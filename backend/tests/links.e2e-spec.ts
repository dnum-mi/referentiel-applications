import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';
import { LinkFaker } from './fakers/link.faker';

describe('Links', () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create();
    application = await ApplicationFaker.create(user);
  });

  it(`/GET applications/:applicationId/links`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/links`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications/:applicationId/links`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/links`)
      .send({
        type: 'documentation',
        link: 'https://example.com',
        description: 'Example link',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });

  it(`/PATCH applications/:applicationId/links/:id`, async () => {
    const TOKEN = await getToken();
    const link = await LinkFaker.create(application);

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/links/${link.id}`)
      .send({
        description: 'Updated description',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/DELETE applications/:applicationId/links/:id`, async () => {
    const TOKEN = await getToken();
    const link = await LinkFaker.create(application);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/links/${link.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
