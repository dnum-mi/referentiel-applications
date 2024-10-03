import { Module } from '@nestjs/common';
import { ReferenceRepositoryService } from './reference-repository.service';
import { ReferenceRepositoryController } from './reference-repository.controller';

@Module({
  controllers: [ReferenceRepositoryController],
  providers: [ReferenceRepositoryService],
})
export class ReferenceRepositoryModule {}
