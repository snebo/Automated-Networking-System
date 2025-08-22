import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

interface CallJob {
  phoneNumber: string;
  scriptId: string;
  priority?: number;
  delay?: number;
}

@Injectable()
export class CallManagerService {
  private readonly logger = new Logger(CallManagerService.name);

  constructor(
    @InjectQueue('call-queue') private callQueue: Queue<CallJob>,
  ) {}

  async queueCall(callData: CallJob): Promise<string> {
    const job = await this.callQueue.add('process-call', callData, {
      priority: callData.priority || 1,
      delay: callData.delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`Queued call job ${job.id} for ${callData.phoneNumber}`);
    return job.id.toString();
  }

  async getQueueStatus() {
    const waiting = await this.callQueue.getWaiting();
    const active = await this.callQueue.getActive();
    const completed = await this.callQueue.getCompleted();
    const failed = await this.callQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.callQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Cancelled call job ${jobId}`);
      return true;
    }
    return false;
  }

  async pauseQueue(): Promise<void> {
    await this.callQueue.pause();
    this.logger.log('Call queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.callQueue.resume();
    this.logger.log('Call queue resumed');
  }
}