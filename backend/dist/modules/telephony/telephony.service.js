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
var TelephonyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelephonyService = void 0;
const common_1 = require("@nestjs/common");
const twilio_service_1 = require("./twilio.service");
const call_interface_1 = require("../../common/interfaces/call.interface");
const event_emitter_1 = require("@nestjs/event-emitter");
let TelephonyService = TelephonyService_1 = class TelephonyService {
    constructor(twilioService, eventEmitter) {
        this.twilioService = twilioService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(TelephonyService_1.name);
        this.activeCalls = new Map();
        this.processedTranscripts = new Map();
    }
    async initiateCall(phoneNumber, scriptId, goal, companyName) {
        try {
            const call = await this.twilioService.makeCall(phoneNumber);
            this.activeCalls.set(call.sid, {
                callSid: call.sid,
                phoneNumber,
                scriptId: scriptId || null,
                goal: goal || 'Navigate to customer support',
                companyName: companyName || 'Unknown Company',
                status: call_interface_1.CallStatus.INITIATING,
                startTime: new Date(),
            });
            this.eventEmitter.emit('call.initiated', {
                callSid: call.sid,
                phoneNumber,
                scriptId: scriptId || null,
                goal: goal || 'Navigate to customer support',
                companyName: companyName || 'Unknown Company',
            });
            return call.sid;
        }
        catch (error) {
            this.logger.error(`Failed to initiate call: ${error.message}`, error.stack);
            throw error;
        }
    }
    async endCall(callSid) {
        try {
            await this.twilioService.endCall(callSid);
            const callData = this.activeCalls.get(callSid);
            if (callData) {
                callData.status = call_interface_1.CallStatus.COMPLETED;
                callData.endTime = new Date();
                this.eventEmitter.emit('call.ended', callData);
                this.activeCalls.delete(callSid);
            }
        }
        catch (error) {
            this.logger.error(`Failed to end call ${callSid}: ${error.message}`, error.stack);
            throw error;
        }
    }
    async sendDTMF(callSid, digits) {
        try {
            await this.twilioService.sendDTMF(callSid, digits);
            const callData = this.activeCalls.get(callSid);
            if (callData) {
                callData.lastDTMFTime = new Date();
            }
            this.eventEmitter.emit('dtmf.sent', {
                callSid,
                digits,
                timestamp: new Date(),
            });
        }
        catch (error) {
            this.logger.error(`Failed to send DTMF: ${error.message}`, error.stack);
            throw error;
        }
    }
    getActiveCall(callSid) {
        return this.activeCalls.get(callSid);
    }
    getAllActiveCalls() {
        return Array.from(this.activeCalls.values());
    }
    handleDTMFReceived(callSid, digits) {
        try {
            const callData = this.activeCalls.get(callSid);
            if (callData) {
                if (!callData.transcript) {
                    callData.transcript = [];
                }
                callData.transcript.push({
                    timestamp: new Date(),
                    speaker: 'human',
                    text: `[DTMF: ${digits}]`,
                    metadata: { type: 'dtmf', digits }
                });
            }
            this.eventEmitter.emit('dtmf.received', {
                callSid,
                digits,
                timestamp: new Date(),
            });
        }
        catch (error) {
            this.logger.error(`Failed to handle DTMF received: ${error.message}`, error.stack);
        }
    }
    updateCallStatus(callSid, status, metadata) {
        try {
            const callData = this.activeCalls.get(callSid);
            if (callData) {
                const oldStatus = callData.status;
                callData.status = status;
                if (metadata) {
                    callData.metadata = { ...callData.metadata, ...metadata };
                }
                this.eventEmitter.emit('call.status-updated', {
                    callSid,
                    oldStatus,
                    newStatus: status,
                    metadata,
                    timestamp: new Date(),
                });
                this.logger.log(`Call ${callSid} status updated: ${oldStatus} -> ${status}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to update call status: ${error.message}`, error.stack);
        }
    }
    handleTranscriptionReceived(callSid, text) {
        if (!this.processedTranscripts.has(callSid)) {
            this.processedTranscripts.set(callSid, new Set());
        }
        const callTranscripts = this.processedTranscripts.get(callSid);
        const transcriptHash = text.trim().toLowerCase();
        if (callTranscripts.has(transcriptHash)) {
            return;
        }
        callTranscripts.add(transcriptHash);
        const activeCall = this.activeCalls.get(callSid);
        if (activeCall) {
            if (!activeCall.transcript) {
                activeCall.transcript = [];
            }
            activeCall.transcript.push({
                timestamp: new Date(),
                speaker: 'ivr',
                text: text,
                source: 'twilio-gather'
            });
        }
        this.eventEmitter.emit('stt.final', {
            callSid,
            transcript: text,
            confidence: 0.95,
            timestamp: new Date(),
        });
    }
    handleGetSession(event) {
        const callData = this.activeCalls.get(event.callSid);
        event.callback(callData);
    }
    handleIVRMenuDetected(event) {
        const activeCall = this.activeCalls.get(event.callSid);
        if (activeCall) {
            if (!activeCall.ivrOptions) {
                activeCall.ivrOptions = [];
            }
            activeCall.ivrOptions = event.options;
            activeCall.lastIvrMenu = {
                options: event.options,
                fullText: event.fullText,
                timestamp: event.timestamp,
            };
        }
    }
    handleAIDecisionMade(event) {
        const activeCall = this.activeCalls.get(event.callSid);
        if (activeCall) {
            if (!activeCall.ivrDecisions) {
                activeCall.ivrDecisions = [];
            }
            activeCall.ivrDecisions.push({
                timestamp: new Date(),
                selectedOption: event.decision.selectedOption,
                reasoning: event.decision.reasoning,
                confidence: event.decision.confidence,
            });
        }
    }
    async handleAISendDTMF(event) {
        await this.sendDTMF(event.callSid, event.digits);
    }
    async handleAISpeak(event) {
        this.eventEmitter.emit('tts.generate', {
            callSid: event.callSid,
            text: event.text,
            priority: 'high',
            context: event.action,
        });
    }
    async handleAIHangup(event) {
        await this.endCall(event.callSid);
    }
    handleCallAnswered(event) {
        const callData = this.activeCalls.get(event.callSid);
        const goal = callData?.goal || 'Navigate to customer support';
        const companyName = callData?.companyName || 'Unknown Company';
        this.eventEmitter.emit('ai.start_session', {
            callSid: event.callSid,
            phoneNumber: event.phoneNumber,
            goal: goal,
            companyName: companyName
        });
    }
    handleCallEnded(event) {
        this.eventEmitter.emit('ai.session_ended', {
            callSid: event.callSid,
        });
    }
};
exports.TelephonyService = TelephonyService;
__decorate([
    (0, event_emitter_1.OnEvent)('call.get_session'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TelephonyService.prototype, "handleGetSession", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ivr.menu_detected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TelephonyService.prototype, "handleIVRMenuDetected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.decision_made'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TelephonyService.prototype, "handleAIDecisionMade", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.send_dtmf'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyService.prototype, "handleAISendDTMF", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.speak'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyService.prototype, "handleAISpeak", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.hangup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyService.prototype, "handleAIHangup", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.answered'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TelephonyService.prototype, "handleCallAnswered", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.ended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TelephonyService.prototype, "handleCallEnded", null);
exports.TelephonyService = TelephonyService = TelephonyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [twilio_service_1.TwilioService,
        event_emitter_1.EventEmitter2])
], TelephonyService);
//# sourceMappingURL=telephony.service.js.map