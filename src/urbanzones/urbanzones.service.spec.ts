import { UrbanzonesService } from './urbanzones.service';
import { INestApplication } from '@nestjs/common';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('UrbanzonesService', () => {
  let service: UrbanzonesService;

  let app: INestApplication;
  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<UrbanzonesService>(UrbanzonesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
