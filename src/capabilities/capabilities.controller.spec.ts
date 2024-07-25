import { INestApplication } from '@nestjs/common';
import { CapabilitiesController } from './capabilities.controller';
import { CapabilitiesService } from './capabilities.service';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('CapabilitiesController', () => {
  let controller: CapabilitiesController;

  let service: CapabilitiesService;
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<CapabilitiesController>(CapabilitiesController);
    service = app.get<CapabilitiesService>(CapabilitiesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
