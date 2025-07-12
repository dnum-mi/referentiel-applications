// relation.e2e-spec.ts
import request from 'supertest';
import { setupTestSuite } from './setup';
import { getToken } from './getToken';
import { RelationType } from '@prisma/client';
import { UserFaker } from './fakers/user.faker';
import { ApplicationFaker } from './fakers/application.faker';
import { getPrismaClient } from './fakers/prisma';

describe('Relations End-to-End', () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  let applicationSource: { id: string };
  let applicationTarget: { id: string };
  let applicationUpdates: { id: string };
  let user: { keycloakId: string };
  let TOKEN: string;
  let relation: {
    id: string;
    applicationSource: string;
    applicationTarget: string;
    type: string;
  };

  beforeAll(async () => {
    // Given
    user = await UserFaker.create(['read', 'write']);
    TOKEN = await getToken(user);
    applicationSource = await ApplicationFaker.create(user);
    applicationTarget = await ApplicationFaker.create(user);
    applicationUpdates = await ApplicationFaker.create(user);
  });
  afterAll(async () => {
    prisma.$disconnect();
  });

  it('should create a relation when provided with a valid DTO', async () => {
    // Given
    const dto = {
      applicationSource: applicationSource.id,
      applicationTarget: applicationTarget.id,
      type: RelationType.is_part_of,
    };

    // When
    const response = await request(app().getHttpServer())
      .post('/relations')
      .send(dto)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    // Then
    relation = response.body;
    expect(relation).toMatchObject(dto);
    expect(relation.id).toBeDefined();
  });

  it('should retrieve all relations', async () => {
    // When
    const response = await request(app().getHttpServer())
      .get('/relations')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  it('should retrieve a relation by its id', async () => {
    // When
    const response = await request(app().getHttpServer())
      .get(`/relations/${relation.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    expect(response.body).toMatchObject({
      id: relation.id,
      applicationSource: relation.applicationSource,
      applicationTarget: relation.applicationTarget,
      type: relation.type,
    });
  });

  it('should update a relation with valid data', async () => {
    // Given
    const updatedDto = {
      applicationSource: applicationSource.id,
      applicationTarget: applicationUpdates.id,
      type: RelationType.is_part_of,
    };

    // When
    const response = await request(app().getHttpServer())
      .patch(`/relations/${relation.id}`)
      .send(updatedDto)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Then: la relation doit être mise à jour avec la nouvelle applicationTarget
    relation = response.body;
    expect(relation.applicationTarget).toEqual(applicationUpdates.id);
  });

  it('should delete a relation', async () => {
    // When
    await request(app().getHttpServer())
      .delete(`/relations/${relation.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it('should return 404 when retrieving a deleted relation', async () => {
    // When
    await request(app().getHttpServer())
      .get(`/relations/${relation.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(404);
  });
});
