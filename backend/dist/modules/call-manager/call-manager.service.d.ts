import { Queue } from 'bull';
interface CallJob {
    phoneNumber: string;
    scriptId: string;
    priority?: number;
    delay?: number;
}
export declare class CallManagerService {
    private callQueue;
    private readonly logger;
    constructor(callQueue: Queue<CallJob>);
    queueCall(callData: CallJob): Promise<string>;
    getQueueStatus(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }>;
    cancelJob(jobId: string): Promise<boolean>;
    pauseQueue(): Promise<void>;
    resumeQueue(): Promise<void>;
}
export {};
