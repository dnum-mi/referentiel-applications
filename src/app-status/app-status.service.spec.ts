import { Test, TestingModule } from '@nestjs/testing';
import { AppStatusService } from './app-status.service';

describe('AppStatusService', () => {
  let service: AppStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppStatusService],
    }).compile();

    service = module.get<AppStatusService>(AppStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
