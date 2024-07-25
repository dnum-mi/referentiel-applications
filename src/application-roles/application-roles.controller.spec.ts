import { ApplicationRolesController } from './application-roles.controller';
import { ApplicationRolesService } from './application-roles.service';
import { setupTestModule, teardownTestModule } from '../test-setup';
import { INestApplication } from '@nestjs/common';

describe('ApplicationRolesController', () => {
  let controller: ApplicationRolesController;

  let service: ApplicationRolesService;
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<ApplicationRolesController>(
      ApplicationRolesController,
    );
    service = app.get<ApplicationRolesService>(ApplicationRolesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
