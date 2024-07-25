import { ApplicationsFlowDataController } from './applications-flow-data.controller';
import { ApplicationsFlowDataService } from './applications-flow-data.service';
import { INestApplication } from '@nestjs/common';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('ApplicationsFlowDataController', () => {
  let controller: ApplicationsFlowDataController;
  let service: ApplicationsFlowDataService;
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<ApplicationsFlowDataController>(
      ApplicationsFlowDataController,
    );
    service = app.get<ApplicationsFlowDataService>(ApplicationsFlowDataService);
  });

  afterAll(async () => await teardownTestModule(app));
  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
