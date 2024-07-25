import { Test, TestingModule } from '@nestjs/testing';
import { CompliancesService } from './compliances.service';

describe('CompliancesService', () => {
  let service: CompliancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompliancesService],
    }).compile();

    service = module.get<CompliancesService>(CompliancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
