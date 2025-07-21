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
  let applicationSource: { id: string; label: string };
  let applicationTarget: { id: string; label: string };
  let applicationUpdates: { id: string; label: string };
  let user: { keycloakId: string };
  let TOKEN: string;
  let relation: {
    id: string;
    applicationSourceId: string;
    applicationTargetId: string;
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
    const applicationSourceId = applicationSource.id;
    const dto = {
      applicationTargetId: applicationTarget.id,
      type: RelationType.is_part_of,
    };

    // When
    const response = await request(app().getHttpServer())
      .post(`/applications/${applicationSourceId}/relations`)
      .send(dto)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(201);

    // Then
    relation = response.body;
    expect(relation).toMatchObject(dto);
    expect(relation.id).toBeDefined();
  });

  it('should retrieve all relations for an application', async () => {
    const applicationSourceId = applicationSource.id;
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${applicationSourceId}/relations`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    response.body.forEach((relation) => {
      expect(Object.values(relation)).toContain(applicationSourceId);
    });
  });

  it('should retrieve a relation by its id', async () => {
    const applicationSourceId = applicationSource.id;
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    expect(response.body).toMatchObject({
      id: relation.id,
      sourceApplication: {
        id: applicationSource.id,
        label: applicationSource.label,
      },
      targetApplication: {
        id: applicationTarget.id,
        label: applicationTarget.label,
      },
      type: relation.type,
    });
  });

  it('should update a relation with valid data', async () => {
    const applicationSourceId = applicationSource.id;
    // Given
    const updatedDto = {
      applicationTargetId: applicationUpdates.id,
      type: RelationType.in_replacement_of,
    };

    // When
    const response = await request(app().getHttpServer())
      .patch(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .send(updatedDto)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    // Then: la relation doit être mise à jour avec la nouvelle applicationTarget
    relation = response.body;
    expect(relation.type).toEqual(RelationType.in_replacement_of);
    expect(relation.applicationTargetId).toEqual(applicationUpdates.id);
  });

  it('should delete a relation', async () => {
    const applicationSourceId = applicationSource.id;
    // When
    await request(app().getHttpServer())
      .delete(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
  });

  it('should return 404 when retrieving a deleted relation', async () => {
    const applicationSourceId = applicationSource.id;
    // When
    await request(app().getHttpServer())
      .get(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(404);
  });
});
