import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { HostingFaker } from './fakers/hosting.faker';
import { HostingOptionFaker } from './fakers/hosting-option.faker';
import { ApplicationFaker } from './fakers/application.faker';

describe('Hostings', () => {
  const app = setupTestSuite();
  let user: { keycloakId: string };
  let application: { id: string };

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
    application = await ApplicationFaker.create(user);
  });

  it(`/GET applications/:applicationId/hostings`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    await HostingFaker.create({
      application: application,
      hostingOption: hostingOption,
    });

    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications/:applicationId/hostings with legacy fields`, async () => {
    const TOKEN = await getToken(user);
    const newHosting = {
      provider: 'DTNUM',
      platform: 'VIRTUALISATION',
      site: 'CER(RENNES)',
      label: 'Test Hosting',
      region: 'Europe',
      nature: 'VIRTUEL',
    };

    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/hostings`)
      .send(newHosting)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.provider).toBe(newHosting.provider);
    expect(response.body.platform).toBe(newHosting.platform);
    expect(response.body.site).toBe(newHosting.site);
    expect(response.body.label).toBe(newHosting.label);
    expect(response.body.region).toBe(newHosting.region);
    expect(response.body.nature).toBe(newHosting.nature);
    expect(response.body.applicationId).toBe(application.id);
  });

  it(`/POST applications/:applicationId/hostings with hostingOption reference`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();

    const newHosting = {
      hostingOptionId: hostingOption.id,
      label: 'Test Hosting with Option',
      region: 'Europe',
      nature: 'VIRTUEL',
    };

    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/hostings`)
      .send(newHosting)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);
  });

  it(`/GET applications/:applicationId/hostings/:id`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application: application,
      hostingOption: hostingOption,
    });

    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings/${hosting.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/PATCH applications/:applicationId/hostings/:id with legacy fields`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application: application,
      hostingOption: hostingOption,
    });

    const updateData = {
      provider: 'SCALEWAY',
      platform: 'CLOUD PI NATIVE',
      site: 'LOGNES(SIL)',
      label: 'Updated Test Hosting',
      region: 'Updated Region',
      nature: 'CLOUD',
    };

    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/hostings/${hosting.id}`)
      .send(updateData)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/PATCH applications/:applicationId/hostings/:id to update hostingOption`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application: application,
      hostingOption: hostingOption,
    });

    const updateData = {
      hostingOptionId: hostingOption.id,
      label: 'Hosting with Updated Option',
    };

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/hostings/${hosting.id}`)
      .send(updateData)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/DELETE applications/:applicationId/hostings/:id`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application: application,
      hostingOption: hostingOption,
    });

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/hostings/${hosting.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
