import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { ProviderFaker } from './fakers/provider.faker';

describe('Providers', () => {
  const app = setupTestSuite();
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
  });

  it(`/GET providers`, async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get('/providers')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST providers`, async () => {
    const TOKEN = await getToken(user);
    const newProvider = {
      name: 'Test Provider',
      description: 'Description for test provider',
    };

    const response = await request(app().getHttpServer())
      .post('/providers')
      .send(newProvider)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.name).toBe(newProvider.name);
    expect(response.body.description).toBe(newProvider.description);
  });

  it(`/GET providers/:id`, async () => {
    const TOKEN = await getToken(user);
    const provider = await ProviderFaker.create();

    const response = await request(app().getHttpServer())
      .get(`/providers/${provider.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBe(provider.id);
    expect(response.body.name).toBe(provider.name);
  });

  it(`/PATCH providers/:id`, async () => {
    const TOKEN = await getToken(user);
    const provider = await ProviderFaker.create();
    const updateData = {
      name: 'Updated Provider Name',
      description: 'Updated description',
    };

    const response = await request(app().getHttpServer())
      .patch(`/providers/${provider.id}`)
      .send(updateData)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.name).toBe(updateData.name);
    expect(response.body.description).toBe(updateData.description);
  });

  it(`/DELETE providers/:id`, async () => {
    const TOKEN = await getToken(user);
    const provider = await ProviderFaker.create();

    await request(app().getHttpServer())
      .delete(`/providers/${provider.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Verify deletion
    await request(app().getHttpServer())
      .get(`/providers/${provider.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(404);
  });
});
