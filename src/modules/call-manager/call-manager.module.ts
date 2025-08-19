import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CallManagerService } from './call-manager.service';
import { CallProcessor } from './call.processor';
import { TelephonyModule } from '../telephony/telephony.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'call-queue',
    }),
    TelephonyModule,
  ],
  providers: [CallManagerService, CallProcessor],
  exports: [CallManagerService],
})
export class CallManagerModule {}