import { Global, Module } from '@nestjs/common';
import { EnvironmentVariablesService } from './environment-variables.service';

@Global()
@Module({
  providers: [EnvironmentVariablesService],
  exports: [EnvironmentVariablesService],
})
export class EnvironmentVariablesModule {}
