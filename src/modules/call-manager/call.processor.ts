import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TelephonyService } from '../telephony/telephony.service';

interface CallJob {
  phoneNumber: string;
  scriptId: string;
  priority?: number;
  delay?: number;
}

@Processor('call-queue')
export class CallProcessor {
  private readonly logger = new Logger(CallProcessor.name);

  constructor(private readonly telephonyService: TelephonyService) {}

  @Process('process-call')
  async handleCall(job: Job<CallJob>) {
    const { phoneNumber, scriptId } = job.data;
    
    this.logger.log(`Processing call job ${job.id}: ${phoneNumber}`);
    
    try {
      // Update job progress
      await job.progress(10);
      
      // Initiate the call
      const callSid = await this.telephonyService.initiateCall(phoneNumber, scriptId);
      
      await job.progress(50);
      this.logger.log(`Call initiated successfully: ${callSid}`);
      
      // For now, we'll consider the job complete once the call is initiated
      // In Phase 3-4, this will include IVR navigation logic
      await job.progress(100);
      
      return { 
        success: true, 
        callSid, 
        phoneNumber,
        scriptId 
      };
      
    } catch (error) {
      this.logger.error(`Call job ${job.id} failed: ${error.message}`, error.stack);
      throw error; // This will mark the job as failed
    }
  }
}