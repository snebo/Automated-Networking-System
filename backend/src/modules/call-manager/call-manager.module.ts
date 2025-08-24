import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CallManagerService } from './call-manager.service';
import { CallProcessor } from './call.processor';
import { CallProgressService } from './call-progress.service';
import { CallProgressGateway } from './call-progress.gateway';
import { CallProgressController } from './call-progress.controller';
import { TelephonyModule } from '../telephony/telephony.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'call-queue',
    }),
    DatabaseModule,
    TelephonyModule,
  ],
  controllers: [CallProgressController],
  providers: [CallManagerService, CallProcessor, CallProgressService, CallProgressGateway],
  exports: [CallManagerService, CallProgressService, CallProgressGateway],
})
export class CallManagerModule {}