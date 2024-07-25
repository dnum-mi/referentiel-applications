import { ApplicationsFlowService } from './applications-flow.service';
import { setupTestModule, teardownTestModule } from '../test-setup';
import { INestApplication } from '@nestjs/common';

describe('ApplicationsFlowService', () => {
  let service: ApplicationsFlowService;

  let app: INestApplication;
  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<ApplicationsFlowService>(ApplicationsFlowService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
