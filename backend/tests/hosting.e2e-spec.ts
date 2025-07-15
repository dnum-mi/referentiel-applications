import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { HostingFaker } from './fakers/hosting.faker';
import { HostingOptionFaker } from './fakers/hosting-option.faker';
import { ApplicationFaker } from './fakers/application.faker';
import { getPrismaClient } from './fakers/prisma';

describe('Hostings', () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  let user: { keycloakId: string };
  let application: { id: string };

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
    application = await ApplicationFaker.create(user);
  });
  afterAll(async () => {
    prisma.$disconnect();
  });

  it(`/GET applications/:applicationId/hostings`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    await HostingFaker.create({
      application: application,
      hostingOption: hostingOption,
      user: user,
    });

    await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST applications/:applicationId/hostings with hostingOption reference`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();

    const newHosting = {
      hostingOptionId: hostingOption.id,
      label: 'Test Hosting with Option',
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
      user: user,
    });

    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/hostings/${hosting.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/PATCH applications/:applicationId/hostings/:id to update hostingOption`, async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const hosting = await HostingFaker.create({
      application: application,
      hostingOption: hostingOption,
      user: user,
    });

    const updateData = {
      applicationId: application.id,
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
      user: user,
    });

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/hostings/${hosting.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
