import { Test, TestingModule } from '@nestjs/testing';
import { AppTypeService } from './app-type.service';

describe('AppTypeService', () => {
  let service: AppTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppTypeService],
    }).compile();

    service = module.get<AppTypeService>(AppTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
