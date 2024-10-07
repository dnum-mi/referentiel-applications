import { Test, TestingModule } from '@nestjs/testing';
import { AppStatusController } from './app-status.controller';

describe('AppStatusController', () => {
  let controller: AppStatusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppStatusController],
    }).compile();

    controller = module.get<AppStatusController>(AppStatusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
