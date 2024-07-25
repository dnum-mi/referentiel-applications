import { EnvironmentVariablesService } from './environment-variables.service';
import { INestApplication } from '@nestjs/common';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('EnvironmentVariablesService', () => {
  let service: EnvironmentVariablesService;

  let app: INestApplication;
  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<EnvironmentVariablesService>(EnvironmentVariablesService);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
