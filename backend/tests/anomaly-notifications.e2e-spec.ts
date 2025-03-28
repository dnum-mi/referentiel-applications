import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { UserFaker } from './fakers/user.faker';

describe('Anomaly Notifications', () => {
  const getApp = setupTestSuite();

  it(`/GET anomaly-notifications`, async () => {
    const app = getApp();
    const user = await UserFaker.create(['write']);
    const TOKEN = await getToken(user);
    return request(app.getHttpServer())
      .get('/anomaly-notifications')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
