import { INestApplication } from '@nestjs/common';
import { UrbanzonesController } from './urbanzones.controller';
import { UrbanzonesService } from './urbanzones.service';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('UrbanzonesController', () => {
  let controller: UrbanzonesController;

  let service: UrbanzonesService;
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<UrbanzonesController>(UrbanzonesController);
    service = app.get<UrbanzonesService>(UrbanzonesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
