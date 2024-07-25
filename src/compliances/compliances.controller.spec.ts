import { Test, TestingModule } from '@nestjs/testing';
import { CompliancesController } from './compliances.controller';
import { CompliancesService } from './compliances.service';

describe('CompliancesController', () => {
  let controller: CompliancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompliancesController],
      providers: [CompliancesService],
    }).compile();

    controller = module.get<CompliancesController>(CompliancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
