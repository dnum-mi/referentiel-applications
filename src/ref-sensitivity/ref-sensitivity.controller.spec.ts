import { Test, TestingModule } from '@nestjs/testing';
import { RefSensitivityController } from './ref-sensitivity.controller';

describe('RefSensitivityController', () => {
  let controller: RefSensitivityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefSensitivityController],
    }).compile();

    controller = module.get<RefSensitivityController>(RefSensitivityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
