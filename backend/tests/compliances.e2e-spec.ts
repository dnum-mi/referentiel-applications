import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';
import { getPrismaClient } from './fakers/prisma';

describe('Compliances', () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  let application: { id: string };
  let user: { keycloakId: string };
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });
  afterAll(async () => {
    prisma.$disconnect();
  });

  it(`/GET applications/:applicationId/compliances`, async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toEqual({});
  });

  it(`/POST applications/:applicationId/compliances - create compliance with RGPD data`, async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/compliances`)
      .send({
        rgpd_has_aipd: true,
        rgpd_dpo_name: 'Jean Dupont',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual('Jean Dupont');
  });

  it(`/GET applications/:applicationId/compliances - should return the compliance`, async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/compliances`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual('Jean Dupont');
  });

  it(`/PATCH applications/:applicationId/compliances - update compliance with RGAA data`, async () => {
    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/compliances`)
      .send({
        rgaa_audit_date: '2023-01-01T00:00:00.000Z',
        rgaa_score_percentage: 85,
        rgaa_service_url: 'https://example.com',
      })
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(response.body.rgaa_score_percentage).toEqual(85);
    expect(response.body.rgaa_service_url).toEqual('https://example.com');
    expect(response.body.rgpd_has_aipd).toEqual(true);
    expect(response.body.rgpd_dpo_name).toEqual('Jean Dupont');
  });
});
