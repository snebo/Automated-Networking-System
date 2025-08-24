import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CallManagerService } from './call-manager.service';
import { CallProcessor } from './call.processor';
import { VerificationWorkflowService } from './verification-workflow.service';
import { CallProgressService } from './call-progress.service';
import { CallProgressGateway } from './call-progress.gateway';
import { CallProgressController } from './call-progress.controller';
import { TelephonyModule } from '../telephony/telephony.module';
import { InformationExtractionModule } from '../information-extraction/information-extraction.module';
import { ScriptManagerModule } from '../script-manager/script-manager.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'call-queue',
    }),
    BullModule.registerQueue({
      name: 'verification-queue',
    }),
    DatabaseModule,
    TelephonyModule,
    InformationExtractionModule,
    ScriptManagerModule,
  ],
  controllers: [CallProgressController],
  providers: [CallManagerService, CallProcessor, VerificationWorkflowService, CallProgressService, CallProgressGateway],
  exports: [CallManagerService, VerificationWorkflowService, CallProgressService, CallProgressGateway],
})
export class CallManagerModule {}