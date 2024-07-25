import { ApplicationsFlowDataService } from './applications-flow-data.service';
import { INestApplication } from '@nestjs/common';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('ApplicationsFlowDataService', () => {
  let service: ApplicationsFlowDataService;

  let app: INestApplication;
  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<ApplicationsFlowDataService>(ApplicationsFlowDataService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
