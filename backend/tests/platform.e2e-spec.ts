import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { PlatformFaker } from './fakers/platform.faker';
import { ProviderFaker } from './fakers/provider.faker';
import { HostingSiteFaker } from './fakers/hosting-site.faker';

describe('Platforms', () => {
  const app = setupTestSuite();
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
  });

  it(`/GET platforms`, async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get('/platforms')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST platforms`, async () => {
    const TOKEN = await getToken(user);
    const provider = await ProviderFaker.create();
    const hostingSite = await HostingSiteFaker.create();

    const newPlatform = {
      name: 'Test Platform',
      description: 'Description for test platform',
      providerId: provider.id,
      hostingSiteId: hostingSite.id,
    };

    const response = await request(app().getHttpServer())
      .post('/platforms')
      .send(newPlatform)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.name).toBe(newPlatform.name);
    expect(response.body.description).toBe(newPlatform.description);
    expect(response.body.providerId).toBe(newPlatform.providerId);
    expect(response.body.hostingSiteId).toBe(newPlatform.hostingSiteId);
  });

  it(`/GET platforms/:id`, async () => {
    const TOKEN = await getToken(user);
    const platform = await PlatformFaker.create();

    const response = await request(app().getHttpServer())
      .get(`/platforms/${platform.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBe(platform.id);
    expect(response.body.name).toBe(platform.name);
  });

  it(`/PATCH platforms/:id`, async () => {
    const TOKEN = await getToken(user);
    const platform = await PlatformFaker.create();
    const updateData = {
      name: 'Updated Platform Name',
      description: 'Updated description',
    };

    const response = await request(app().getHttpServer())
      .patch(`/platforms/${platform.id}`)
      .send(updateData)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.name).toBe(updateData.name);
    expect(response.body.description).toBe(updateData.description);
  });

  it(`/DELETE platforms/:id`, async () => {
    const TOKEN = await getToken(user);
    const platform = await PlatformFaker.create();

    await request(app().getHttpServer())
      .delete(`/platforms/${platform.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Verify deletion
    await request(app().getHttpServer())
      .get(`/platforms/${platform.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(404);
  });
});
