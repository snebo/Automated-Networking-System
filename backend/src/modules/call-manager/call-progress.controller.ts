import { Controller, Get, Param, Logger } from '@nestjs/common';
import { CallProgressService } from './call-progress.service';

@Controller('call-progress')
export class CallProgressController {
  private readonly logger = new Logger(CallProgressController.name);

  constructor(private readonly callProgressService: CallProgressService) {}

  @Get()
  getAllCalls() {
    try {
      return {
        success: true,
        data: this.callProgressService.getAllCallsProgress()
      };
    } catch (error) {
      this.logger.error(`Failed to get all calls progress: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':callSid')
  getCallProgress(@Param('callSid') callSid: string) {
    try {
      const progress = this.callProgressService.getCallProgress(callSid);
      return {
        success: true,
        data: {
          callSid,
          progress
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get call progress for ${callSid}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}