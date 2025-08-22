"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CallManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallManagerService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
let CallManagerService = CallManagerService_1 = class CallManagerService {
    constructor(callQueue) {
        this.callQueue = callQueue;
        this.logger = new common_1.Logger(CallManagerService_1.name);
    }
    async queueCall(callData) {
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
    async cancelJob(jobId) {
        const job = await this.callQueue.getJob(jobId);
        if (job) {
            await job.remove();
            this.logger.log(`Cancelled call job ${jobId}`);
            return true;
        }
        return false;
    }
    async pauseQueue() {
        await this.callQueue.pause();
        this.logger.log('Call queue paused');
    }
    async resumeQueue() {
        await this.callQueue.resume();
        this.logger.log('Call queue resumed');
    }
};
exports.CallManagerService = CallManagerService;
exports.CallManagerService = CallManagerService = CallManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)('call-queue')),
    __metadata("design:paramtypes", [Object])
], CallManagerService);
//# sourceMappingURL=call-manager.service.js.map