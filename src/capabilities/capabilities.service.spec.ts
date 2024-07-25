import { INestApplication } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('CapabilitiesService', () => {
  let service: CapabilitiesService;

  let app: INestApplication;
  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<CapabilitiesService>(CapabilitiesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
