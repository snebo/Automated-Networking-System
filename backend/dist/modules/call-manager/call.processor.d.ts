import { Job } from 'bull';
import { TelephonyService } from '../telephony/telephony.service';
interface CallJob {
    phoneNumber: string;
    scriptId: string;
    priority?: number;
    delay?: number;
}
export declare class CallProcessor {
    private readonly telephonyService;
    private readonly logger;
    constructor(telephonyService: TelephonyService);
    handleCall(job: Job<CallJob>): Promise<{
        success: boolean;
        callSid: string;
        phoneNumber: string;
        scriptId: string;
    }>;
}
export {};
