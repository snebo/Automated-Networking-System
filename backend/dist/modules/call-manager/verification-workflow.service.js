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
var VerificationWorkflowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationWorkflowService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../database/prisma.service");
const telephony_service_1 = require("../telephony/telephony.service");
const script_manager_service_1 = require("../script-manager/script-manager.service");
const information_extraction_service_1 = require("../information-extraction/information-extraction.service");
const bull_1 = require("@nestjs/bull");
let VerificationWorkflowService = VerificationWorkflowService_1 = class VerificationWorkflowService {
    constructor(prisma, telephonyService, scriptManager, informationExtraction, eventEmitter, verificationQueue) {
        this.prisma = prisma;
        this.telephonyService = telephonyService;
        this.scriptManager = scriptManager;
        this.informationExtraction = informationExtraction;
        this.eventEmitter = eventEmitter;
        this.verificationQueue = verificationQueue;
        this.logger = new common_1.Logger(VerificationWorkflowService_1.name);
        this.activeWorkflows = new Map();
    }
    async startWorkflow(request) {
        this.logger.log(`Starting verification workflow for business ${request.businessId}`);
        const business = await this.prisma.business.findUnique({
            where: { id: request.businessId }
        });
        if (!business) {
            throw new Error('Business not found');
        }
        if (!business.phoneNumber) {
            throw new Error('Business has no phone number');
        }
        const workflow = {
            businessId: request.businessId,
            status: request.skipVerification ? 'verified' : 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.activeWorkflows.set(request.businessId, workflow);
        await this.prisma.business.update({
            where: { id: request.businessId },
            data: { callStatus: 'workflow_pending' }
        });
        if (request.skipVerification) {
            await this.startInformationGathering(request);
        }
        else {
            await this.startVerification(request);
        }
        return workflow;
    }
    async startVerification(request) {
        this.logger.log(`Starting verification phase for business ${request.businessId}`);
        const workflow = this.activeWorkflows.get(request.businessId);
        if (!workflow)
            return;
        workflow.status = 'verifying';
        workflow.updatedAt = new Date();
        try {
            const business = await this.prisma.business.findUnique({
                where: { id: request.businessId }
            });
            const verificationScript = await this.scriptManager.getOrCreateScriptForBusiness(request.businessId, undefined, undefined, true);
            const callSid = await this.telephonyService.initiateCall(business.phoneNumber, verificationScript.id, `Verify this is ${business.name}`, business.name);
            workflow.verificationCallSid = callSid;
            workflow.updatedAt = new Date();
            this.logger.log(`Verification call initiated: ${callSid}`);
            setTimeout(() => {
                this.checkVerificationTimeout(request.businessId);
            }, 5 * 60 * 1000);
        }
        catch (error) {
            this.logger.error(`Failed to start verification for business ${request.businessId}: ${error.message}`);
            workflow.status = 'failed';
            workflow.error = error.message;
            workflow.updatedAt = new Date();
            await this.prisma.business.update({
                where: { id: request.businessId },
                data: { callStatus: 'failed' }
            });
        }
    }
    async startInformationGathering(request) {
        this.logger.log(`Starting information gathering phase for business ${request.businessId}`);
        const workflow = this.activeWorkflows.get(request.businessId);
        if (!workflow)
            return;
        workflow.status = 'gathering_info';
        workflow.updatedAt = new Date();
        try {
            const business = await this.prisma.business.findUnique({
                where: { id: request.businessId }
            });
            const informationScript = await this.scriptManager.getOrCreateScriptForBusiness(request.businessId, request.targetPerson, request.specificGoal, false);
            const callSid = await this.telephonyService.initiateCall(business.phoneNumber, informationScript.id, request.specificGoal || `Find ${request.targetPerson || 'the right contact'} at ${business.name}`, business.name);
            workflow.informationCallSid = callSid;
            workflow.updatedAt = new Date();
            this.logger.log(`Information gathering call initiated: ${callSid}`);
            setTimeout(() => {
                this.checkInformationTimeout(request.businessId);
            }, 10 * 60 * 1000);
        }
        catch (error) {
            this.logger.error(`Failed to start information gathering for business ${request.businessId}: ${error.message}`);
            workflow.status = 'failed';
            workflow.error = error.message;
            workflow.updatedAt = new Date();
            await this.prisma.business.update({
                where: { id: request.businessId },
                data: { callStatus: 'failed' }
            });
        }
    }
    async handleCallEnded(event) {
        this.logger.log(`Call ended: ${event.callSid}`);
        const workflow = Array.from(this.activeWorkflows.values()).find(w => w.verificationCallSid === event.callSid || w.informationCallSid === event.callSid);
        if (!workflow)
            return;
        if (workflow.verificationCallSid === event.callSid) {
            await this.handleVerificationComplete(workflow.businessId, event.outcome);
        }
        else if (workflow.informationCallSid === event.callSid) {
            await this.handleInformationComplete(workflow.businessId, event.outcome);
        }
    }
    async handleVerificationComplete(businessId, outcome) {
        this.logger.log(`Verification complete for business ${businessId}`);
        const workflow = this.activeWorkflows.get(businessId);
        if (!workflow)
            return;
        const verificationResult = this.analyzeVerificationOutcome(outcome);
        workflow.verificationResult = verificationResult;
        if (verificationResult.numberValid && verificationResult.businessConfirmed) {
            workflow.status = 'verified';
            this.logger.log(`Business ${businessId} verified successfully`);
            await this.prisma.business.update({
                where: { id: businessId },
                data: { callStatus: 'verified' }
            });
            const request = this.getOriginalRequest(businessId);
            if (request) {
                await this.startInformationGathering(request);
            }
        }
        else {
            workflow.status = 'failed_verification';
            this.logger.log(`Business ${businessId} failed verification`);
            await this.prisma.business.update({
                where: { id: businessId },
                data: {
                    callStatus: 'failed_verification',
                    metadata: { verificationResult }
                }
            });
        }
        workflow.updatedAt = new Date();
    }
    async handleInformationComplete(businessId, outcome) {
        this.logger.log(`Information gathering complete for business ${businessId}`);
        const workflow = this.activeWorkflows.get(businessId);
        if (!workflow)
            return;
        let extractedInfo = null;
        if (outcome?.transcript && workflow.informationCallSid) {
            try {
                const request = this.getOriginalRequest(businessId);
                extractedInfo = await this.informationExtraction.extractAndStoreInformation(workflow.informationCallSid, businessId, outcome.transcript, request?.targetPerson, request?.specificGoal);
                this.logger.log(`AI-extracted information stored for business ${businessId}`);
            }
            catch (error) {
                this.logger.error(`Failed to extract information for business ${businessId}: ${error.message}`);
            }
        }
        const informationResult = this.analyzeInformationOutcome(outcome);
        workflow.informationResult = informationResult;
        workflow.status = 'completed';
        workflow.updatedAt = new Date();
        await this.prisma.business.update({
            where: { id: businessId },
            data: {
                callStatus: 'completed',
                metadata: {
                    ...workflow.verificationResult ? { verificationResult: workflow.verificationResult } : {},
                    informationResult,
                    workflowCompletedAt: new Date(),
                    ...(extractedInfo ? { aiExtractedInfo: true } : {})
                }
            }
        });
        this.logger.log(`Workflow completed for business ${businessId}`);
        this.eventEmitter.emit('workflow.completed', {
            businessId,
            workflow,
            informationResult,
            extractedInfo
        });
    }
    analyzeVerificationOutcome(outcome) {
        return {
            numberValid: true,
            businessConfirmed: true,
            notes: 'Verification call completed'
        };
    }
    analyzeInformationOutcome(outcome) {
        return {
            targetPersonFound: false,
            notes: 'Information gathering call completed',
            contactInformation: {}
        };
    }
    async checkVerificationTimeout(businessId) {
        const workflow = this.activeWorkflows.get(businessId);
        if (!workflow || workflow.status !== 'verifying')
            return;
        this.logger.warn(`Verification timeout for business ${businessId}`);
        workflow.status = 'failed_verification';
        workflow.error = 'Verification call timeout';
        workflow.updatedAt = new Date();
        await this.prisma.business.update({
            where: { id: businessId },
            data: { callStatus: 'failed_verification' }
        });
    }
    async checkInformationTimeout(businessId) {
        const workflow = this.activeWorkflows.get(businessId);
        if (!workflow || workflow.status !== 'gathering_info')
            return;
        this.logger.warn(`Information gathering timeout for business ${businessId}`);
        workflow.status = 'failed';
        workflow.error = 'Information gathering call timeout';
        workflow.updatedAt = new Date();
        await this.prisma.business.update({
            where: { id: businessId },
            data: { callStatus: 'failed' }
        });
    }
    getOriginalRequest(businessId) {
        return {
            businessId,
            targetPerson: 'manager',
            specificGoal: 'Get contact information'
        };
    }
    async getWorkflowStatus(businessId) {
        return this.activeWorkflows.get(businessId) || null;
    }
    async getAllActiveWorkflows() {
        return Array.from(this.activeWorkflows.values());
    }
    async cancelWorkflow(businessId) {
        const workflow = this.activeWorkflows.get(businessId);
        if (!workflow)
            return false;
        if (workflow.verificationCallSid) {
            try {
                await this.telephonyService.endCall(workflow.verificationCallSid);
            }
            catch (error) {
                this.logger.warn(`Failed to end verification call: ${error.message}`);
            }
        }
        if (workflow.informationCallSid) {
            try {
                await this.telephonyService.endCall(workflow.informationCallSid);
            }
            catch (error) {
                this.logger.warn(`Failed to end information call: ${error.message}`);
            }
        }
        workflow.status = 'failed';
        workflow.error = 'Workflow cancelled';
        workflow.updatedAt = new Date();
        await this.prisma.business.update({
            where: { id: businessId },
            data: { callStatus: 'cancelled' }
        });
        this.activeWorkflows.delete(businessId);
        this.logger.log(`Workflow cancelled for business ${businessId}`);
        return true;
    }
    async startBatchWorkflow(requests) {
        this.logger.log(`Starting batch workflow for ${requests.length} businesses`);
        const results = [];
        for (const request of requests) {
            try {
                const workflow = await this.startWorkflow(request);
                results.push(workflow);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                this.logger.error(`Failed to start workflow for business ${request.businessId}: ${error.message}`);
                results.push({
                    businessId: request.businessId,
                    status: 'failed',
                    error: error.message,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
        return results;
    }
};
exports.VerificationWorkflowService = VerificationWorkflowService;
__decorate([
    (0, event_emitter_1.OnEvent)('call.ended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VerificationWorkflowService.prototype, "handleCallEnded", null);
exports.VerificationWorkflowService = VerificationWorkflowService = VerificationWorkflowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, bull_1.InjectQueue)('verification-queue')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        telephony_service_1.TelephonyService,
        script_manager_service_1.ScriptManagerService,
        information_extraction_service_1.InformationExtractionService,
        event_emitter_1.EventEmitter2, Object])
], VerificationWorkflowService);
//# sourceMappingURL=verification-workflow.service.js.map