import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';
import { HostingFaker } from './fakers/hosting.faker';

describe('Hostings', () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create();
    application = await ApplicationFaker.create(user);
  });

  it(`/GET applications/:applicationId/hostings`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications/:applicationId/hostings`, async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/hostings`)
      .send({
        provider: 'AWS',
        label: 'AWS Hosting',
        region: 'us-east-1',
        site: 'example.com',
        nature: 'CLOUD', // Valeur de l'enum Nature
        platform: 'EC2',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });

  it(`/PATCH applications/:applicationId/hostings/:id`, async () => {
    const TOKEN = await getToken();
    const hosting = await HostingFaker.create(application);

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/hostings/${hosting.id}`)
      .send({
        label: 'Updated AWS Hosting',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/DELETE applications/:applicationId/hostings/:id`, async () => {
    const TOKEN = await getToken();
    const hosting = await HostingFaker.create(application);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/hostings/${hosting.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
