import { Module } from '@nestjs/common';
import { CallManagerService } from './call-manager.service';

@Module({
  providers: [CallManagerService],
  exports: [CallManagerService],
})
export class CallManagerModule {}