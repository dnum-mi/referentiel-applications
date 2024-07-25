import { INestApplication } from '@nestjs/common';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('InstancesController', () => {
  let controller: InstancesController;

  let service: InstancesService;
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<InstancesController>(InstancesController);
    service = app.get<InstancesService>(InstancesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
