import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';

describe('Anomaly Notifications', () => {
  const getApp = setupTestSuite();

  it(`/GET anomaly-notifications`, async () => {
    const app = getApp();
    const TOKEN = await getToken();
    return request(app.getHttpServer())
      .get('/anomaly-notifications')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });
});
