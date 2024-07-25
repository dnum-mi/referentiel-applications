import { INestApplication } from '@nestjs/common';
import { InstancesService } from './instances.service';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('InstancesService', () => {
  let service: InstancesService;

  let app: INestApplication;
  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<InstancesService>(InstancesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
