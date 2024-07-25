import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ActeursController } from './acteurs.controller';
import { setupTestModule, teardownTestModule } from '../test-setup';

import { UpdateActeurDto } from './dto/update-acteur.dto';
import { v4 as uuidv4 } from 'uuid';
import { ActActor } from '@prisma/client';
import { ActeursService } from './acteurs.service';

describe('ActeursController', () => {
  let app: INestApplication;
  let controller: ActeursController;
  let service: ActeursService;
  let acteur: ActActor;
  const uuid = uuidv4();

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<ActeursController>(ActeursController);
    service = app.get<ActeursService>(ActeursService);
    acteur = await service.create('Testing', {
      name: 'test',
      email: 'test@test.com',
    });
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should give 404 if GET /acteurs requested with invalid actorid', async () => {
    return request(app.getHttpServer()).get(`/acteurs/${uuid}`).expect(404);
  });

  it(`should return the Acteur in question, when request GET /acteurs with valid actorid param`, async () => {
    return request(app.getHttpServer())
      .get(`/acteurs/${acteur.actorid}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.actorid).toEqual(acteur.actorid);
      });
  });

  it(`shouldn't update Acteur by calling PUT /acteurs with actorid param, and invalid request data`, async () => {
    const newActeurData: UpdateActeurDto = {
      name: '',
      email: 'newtest',
    };

    return request(app.getHttpServer())
      .put(`/acteurs/${acteur.actorid}`)
      .send(newActeurData)
      .expect(400);
  });

  it(`should update Acteur by calling PUT /acteurs with actorid param, and valid request data`, async () => {
    const newActeurData: UpdateActeurDto = {
      name: 'newtest',
      email: 'newtest@test.com',
    };

    const response = await request(app.getHttpServer())
      .put(`/acteurs/${acteur.actorid}`)
      .send(newActeurData)
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining(newActeurData));
  });
});
