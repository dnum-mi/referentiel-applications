import { GlobalSearchController } from './global-search.controller';
import { INestApplication } from '@nestjs/common';
import { setupTestModule, teardownTestModule } from '../test-setup';

describe('GlobalSearchController', () => {
  let controller: GlobalSearchController;

  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<GlobalSearchController>(GlobalSearchController);
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
