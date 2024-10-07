import { Test, TestingModule } from '@nestjs/testing';
import { AppTypeController } from './app-type.controller';

describe('AppTypeController', () => {
  let controller: AppTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppTypeController],
    }).compile();

    controller = module.get<AppTypeController>(AppTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
