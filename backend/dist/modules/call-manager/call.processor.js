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
var CallProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const telephony_service_1 = require("../telephony/telephony.service");
let CallProcessor = CallProcessor_1 = class CallProcessor {
    constructor(telephonyService) {
        this.telephonyService = telephonyService;
        this.logger = new common_1.Logger(CallProcessor_1.name);
    }
    async handleCall(job) {
        const { phoneNumber, scriptId } = job.data;
        this.logger.log(`Processing call job ${job.id}: ${phoneNumber}`);
        try {
            await job.progress(10);
            const callSid = await this.telephonyService.initiateCall(phoneNumber, scriptId);
            await job.progress(50);
            this.logger.log(`Call initiated successfully: ${callSid}`);
            await job.progress(100);
            return {
                success: true,
                callSid,
                phoneNumber,
                scriptId
            };
        }
        catch (error) {
            this.logger.error(`Call job ${job.id} failed: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.CallProcessor = CallProcessor;
__decorate([
    (0, bull_1.Process)('process-call'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CallProcessor.prototype, "handleCall", null);
exports.CallProcessor = CallProcessor = CallProcessor_1 = __decorate([
    (0, bull_1.Processor)('call-queue'),
    __metadata("design:paramtypes", [telephony_service_1.TelephonyService])
], CallProcessor);
//# sourceMappingURL=call.processor.js.map