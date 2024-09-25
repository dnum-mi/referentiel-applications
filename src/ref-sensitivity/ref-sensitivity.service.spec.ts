import { Test, TestingModule } from '@nestjs/testing';
import { RefSensitivityService } from './ref-sensitivity.service';

describe('RefSensitivityService', () => {
  let service: RefSensitivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefSensitivityService],
    }).compile();

    service = module.get<RefSensitivityService>(RefSensitivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
