import { Module } from '@nestjs/common';
import { ActeursService } from './acteurs.service';
import { ActeursController } from './acteurs.controller';

@Module({
  imports: [],
  providers: [ActeursService],
  controllers: [ActeursController],
  exports: [],
})
export class ActeursModule {}
