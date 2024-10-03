import { Module } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { MetadataController } from './metadata.controller';

@Module({
  controllers: [MetadataController],
  providers: [MetadataService],
})
export class MetadataModule {}
