import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';

describe('AppController (e2e)', () => {
  const app = setupTestSuite();

  it('/ (GET)', async () => {
    const TOKEN = await getToken();
    await request(app().getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)
      .expect('Hello World!');
  });
});
