import { ApplicationsFlowController } from './applications-flow.controller';
import { ApplicationsFlowService } from './applications-flow.service';
import { INestApplication } from '@nestjs/common';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('ApplicationsFlowController', () => {
  let controller: ApplicationsFlowController;

  let service: ApplicationsFlowService;
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<ApplicationsFlowController>(
      ApplicationsFlowController,
    );
    service = app.get<ApplicationsFlowService>(ApplicationsFlowService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });
});
