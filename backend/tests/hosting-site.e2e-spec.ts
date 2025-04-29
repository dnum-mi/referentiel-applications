import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';
import { HostingSiteFaker } from './fakers/hosting-site.faker';

describe('HostingSites', () => {
  const app = setupTestSuite();
  let user: { keycloakId: string };

  beforeAll(async () => {
    user = await UserFaker.create(['read', 'write']);
  });

  it(`/GET hosting-sites`, async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get('/hosting-sites')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it(`/POST hosting-sites`, async () => {
    const TOKEN = await getToken(user);
    const newSite = {
      name: 'Test Site',
      building: 'Building A',
      room: 'Room 101',
      description: 'Description for test site',
    };

    const response = await request(app().getHttpServer())
      .post('/hosting-sites')
      .send(newSite)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.name).toBe(newSite.name);
    expect(response.body.building).toBe(newSite.building);
    expect(response.body.room).toBe(newSite.room);
    expect(response.body.description).toBe(newSite.description);
  });

  it(`/GET hosting-sites/:id`, async () => {
    const TOKEN = await getToken(user);
    const site = await HostingSiteFaker.create();

    const response = await request(app().getHttpServer())
      .get(`/hosting-sites/${site.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.id).toBe(site.id);
    expect(response.body.name).toBe(site.name);
  });

  it(`/PATCH hosting-sites/:id`, async () => {
    const TOKEN = await getToken(user);
    const site = await HostingSiteFaker.create();
    const updateData = {
      name: 'Updated Site Name',
      building: 'Updated Building',
      room: 'Updated Room',
      description: 'Updated description',
    };

    const response = await request(app().getHttpServer())
      .patch(`/hosting-sites/${site.id}`)
      .send(updateData)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.name).toBe(updateData.name);
    expect(response.body.building).toBe(updateData.building);
    expect(response.body.room).toBe(updateData.room);
    expect(response.body.description).toBe(updateData.description);
  });

  it(`/DELETE hosting-sites/:id`, async () => {
    const TOKEN = await getToken(user);
    const site = await HostingSiteFaker.create();

    await request(app().getHttpServer())
      .delete(`/hosting-sites/${site.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Verify deletion
    await request(app().getHttpServer())
      .get(`/hosting-sites/${site.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(404);
  });
});
