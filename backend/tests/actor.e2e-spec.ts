import request from 'supertest';
import { setupTestSuite } from './setup';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma/prisma.service';

const TOKEN =
  'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIwYXBzYjYxQzVFa2x6d2JjRUpXYXZPeXllMk5UQ29FRHpRb2lFdWFlTjJnIn0.eyJzdWIiOiI5OWZhNDE5ZS1mNGZiLTRlZDctOGIxMS1jNzIxMGIzMDkiLCAiZW1haWwiOiJ0aG9tYXMuYmVybmFyZC1lY29ub2NvbUBpbnRlcmlldXIuZ291di5mciJ9.';

describe('Actor', () => {
  const getApp = setupTestSuite();
  const keycloakId = uuidv4();
  const applicationId = uuidv4();

  beforeAll(async () => {
    const prismaService = new PrismaService();
    await prismaService.user.create({
      data: {
        email: `${keycloakId}@test.fr`,
        keycloakId: keycloakId,
      },
    });
    await prismaService.application.create({
      data: {
        id: applicationId,
        label: 'Test Application',
        description: 'Test Application Description',
        owner: {
          connect: {
            keycloakId: keycloakId,
          },
        },
        metadata: {
          create: {
            createdById: keycloakId,
            updatedById: keycloakId,
          },
        },
      },
    });
  });

  it(`/POST actor`, () => {
    const app = getApp();
    return request(app.getHttpServer())
      .post('/actor')
      .send({
        role: 'test',
        email: 'test@test.co',
        firstname: 'firstname',
        lastname: 'lastname',
        type: 'Autre',
        organizationId: '',
        applicationId: applicationId,
      })
      .set('Authorization', TOKEN)
      .expect(201);
  });

  it(`/GET actor`, () => {
    const app = getApp();
    return request(app.getHttpServer())
      .get('/actor')
      .set('Authorization', TOKEN)
      .expect(200);
  });
});
