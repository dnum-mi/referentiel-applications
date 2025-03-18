import request from 'supertest';
import { setupTestSuite } from './setup';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma/prisma.service';
import { getToken } from './getToken';

describe('AppController (e2e)', () => {
  const app = setupTestSuite();
  const keycloakId = uuidv4();

  beforeAll(async () => {
    const prismaService = new PrismaService();
    await prismaService.user.create({
      data: {
        email: `${keycloakId}@test.fr`,
        keycloakId: keycloakId,
      },
    });
  });

  it('/ (GET)', async () => {
    const TOKEN = await getToken();
    return request(app().getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200)
      .expect('Hello World!');
  });
});
