import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';

describe('Compliances', () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: { keycloakId: string };
  let TOKEN: string;
  let createdCompliance: { id: string };

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });

  it(`/GET applications/:applicationId/compliances`, async () => {
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications/:applicationId/compliances`, async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({
        name: 'RGPD Compliance',
        type: 'regulation',
        status: 'compliant',
        validityStart: '2023-01-01T00:00:00.000Z',
        validityEnd: '2025-01-01T00:00:00.000Z',
        scoreValue: '85',
        scoreUnit: '%',
        notes: 'General Data Protection Regulation compliance',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    createdCompliance = response.body;
    expect(response.body.id).toBeDefined();
    expect(response.body.name).toEqual('RGPD Compliance');
  });

  it(`/GET applications/:applicationId/compliances/:id`, async () => {
    const response = await request(app().getHttpServer())
      .get(
        `/applications/${application.id}/compliances/${createdCompliance.id}`,
      )
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toEqual(createdCompliance.id);
    expect(response.body.name).toEqual('RGPD Compliance');
  });

  it(`/PATCH applications/:applicationId/compliances/:id`, async () => {
    const updatedData = {
      name: 'Updated RGPD Compliance',
      status: 'non_compliant',
      notes: 'Updated compliance notes',
      scoreValue: '40',
    };

    const response = await request(app().getHttpServer())
      .patch(
        `/applications/${application.id}/compliances/${createdCompliance.id}`,
      )
      .send(updatedData)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.name).toEqual('Updated RGPD Compliance');
    expect(response.body.status).toEqual('non_compliant');
    expect(response.body.notes).toEqual('Updated compliance notes');
    expect(response.body.scoreValue).toEqual('40');
    expect(response.body.type).toEqual('regulation');
  });

  it(`/DELETE applications/:applicationId/compliances/:id`, async () => {
    await request(app().getHttpServer())
      .delete(
        `/applications/${application.id}/compliances/${createdCompliance.id}`,
      )
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`should return 404 when retrieving a deleted compliance`, async () => {
    await request(app().getHttpServer())
      .get(
        `/applications/${application.id}/compliances/${createdCompliance.id}`,
      )
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(404);
  });
});
