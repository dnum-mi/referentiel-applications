import { INestApplication } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { setupTestModule, teardownTestModule } from '../test-setup';
import { AppApplication } from '@prisma/client';
import { createApp } from './test-setup';
import { Application } from './entities/application.entity';

describe('ApplicationsService', () => {
  let app: INestApplication;
  let service: ApplicationsService;
  let application: Application;

  //TODO more testing
  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<ApplicationsService>(ApplicationsService);

    application = (await createApp(service)) as Application;
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be able to select application by applicationid', async () => {
    const selectedApplication = await service.getOneById(
      application.applicationid,
    );

    expect(application).toEqual(selectedApplication);
  });

  it('should be able get all the applications from database', async () => {
    const apps = await service.getAllBy({});

    expect(Array.isArray(apps.data)).toBe(true);
  });

  it('should be able to create Application', async () => {
    const longname = 'long name ';
    const Application: AppApplication = (await createApp(
      service,
      application.organisationunitid,
      {
        longname,
      },
    )) as Application;

    expect(Application).toBeDefined();
    expect(Application?.longname).toEqual(longname);
  });

  it('should be able to update Application by idApplication', async () => {
    const longname = new Date().toISOString();

    const updatedApplication = await service.updateOrCreate(
      'testing',
      { longname },
      application,
    );

    expect(updatedApplication).toBeDefined();

    expect((updatedApplication as Application).longname).toEqual(longname);
  });
});
