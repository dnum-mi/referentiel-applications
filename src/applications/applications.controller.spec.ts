import { setupTestModule, teardownTestModule } from '../test-setup';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { INestApplication } from '@nestjs/common';
import { createApp as createAppApplication } from './test-setup';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppApplication } from '@prisma/client';
import { Application } from './entities/application.entity';

describe('ApplicationsController', () => {
  let app: INestApplication;
  let controller: ApplicationsController;
  let service: ApplicationsService;
  let application: AppApplication;
  //TODO more testing
  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<ApplicationsController>(ApplicationsController);
    service = app.get<ApplicationsService>(ApplicationsService);
    application = (await createAppApplication(service)) as Application;
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(application).toBeDefined();
  });

  it('should give 404 if GET /applications requested with invalid applicationid', async () => {
    return request(app.getHttpServer())
      .get(`/applications/${uuidv4()}`)
      .expect(404);
  });

  it(`should return the Application in question, when request GET /applications with valid idApplication param`, async () => {
    return request(app.getHttpServer())
      .get(`/applications/${application.applicationid}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.applicationid).toEqual(application.applicationid);
      });
  });
});
