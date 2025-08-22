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
var TelephonyController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelephonyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const telephony_service_1 = require("./telephony.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const initiate_call_dto_1 = require("./dto/initiate-call.dto");
const send_dtmf_dto_1 = require("./dto/send-dtmf.dto");
let TelephonyController = TelephonyController_1 = class TelephonyController {
    constructor(telephonyService, eventEmitter) {
        this.telephonyService = telephonyService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(TelephonyController_1.name);
        this.waitingCalls = new Set();
        this.humanConversationCalls = new Set();
        this.eventEmitter.on('ai.entering_wait_state', (event) => {
            console.log(`📋 Telephony controller: Call ${event.callSid.slice(-8)} entering wait state`);
            this.waitingCalls.add(event.callSid);
        });
        this.eventEmitter.on('ai.human_reached', (event) => {
            console.log(`📋 Telephony controller: Call ${event.callSid.slice(-8)} exiting wait state`);
            this.waitingCalls.delete(event.callSid);
            this.humanConversationCalls.add(event.callSid);
        });
        this.eventEmitter.on('call.ended', (event) => {
            this.waitingCalls.delete(event.callSid);
            this.humanConversationCalls.delete(event.callSid);
        });
    }
    async initiateCall(dto) {
        const callSid = await this.telephonyService.initiateCall(dto.phoneNumber, dto.scriptId, dto.goal, dto.companyName);
        return { callSid };
    }
    async endCall(callSid) {
        await this.telephonyService.endCall(callSid);
    }
    async sendDTMF(callSid, dto) {
        await this.telephonyService.sendDTMF(callSid, dto.digits);
        return { success: true };
    }
    async getActiveCalls() {
        return this.telephonyService.getAllActiveCalls();
    }
    async getCallStatus(callSid) {
        return this.telephonyService.getActiveCall(callSid);
    }
    async handleWebhook(body) {
        this.logger.log('Main webhook called for media streaming:', JSON.stringify(body));
        const { CallSid, CallStatus, Direction, From, To } = body;
        this.logger.log(`Call ${CallSid}: Status=${CallStatus}, Direction=${Direction}, From=${From}, To=${To}`);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const streamUrl = appUrl.replace('https://', 'wss://').replace('http://', 'ws://');
        this.logger.log(`Setting up media stream to: ${streamUrl}/media-stream`);
        const isWaiting = this.isCallInWaitingState(CallSid);
        const isHumanConversation = this.humanConversationCalls.has(CallSid);
        if (isWaiting) {
            console.log(`⏸️  Main webhook: Call in WAITING state - using silent extended timeout (120s, resets on speech)`);
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="120" speechTimeout="10" input="dtmf speech">
    <Pause length="115"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
        }
        if (isHumanConversation) {
            console.log(`🗣️  Main webhook: Call in HUMAN CONVERSATION - staying silent and listening`);
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
        }
        const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
        this.logger.log('TwiML Response:', twimlResponse);
        return twimlResponse;
    }
    async handleStatusCallback(body) {
        this.logger.log('Call status update:', body);
        const { CallSid, CallStatus, Duration, CallDuration } = body;
        if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
            console.log('\n' + '🔴'.repeat(80));
            console.log(`📞 CALL ENDED | ${CallSid.slice(-8)} | Status: ${CallStatus.toUpperCase()}`);
            const actualDuration = CallDuration || Duration;
            if (actualDuration)
                console.log(`⏰ Duration: ${actualDuration} seconds`);
            console.log('🔴'.repeat(80));
            console.log('');
        }
        const activeCall = this.telephonyService.getActiveCall(CallSid);
        if (activeCall) {
            activeCall.status = this.mapTwilioStatus(CallStatus);
            activeCall.duration = Duration ? parseInt(Duration) : undefined;
            if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
                activeCall.endTime = new Date();
            }
        }
        return { received: true };
    }
    async handleMediaStream(body) {
        this.logger.log('Media stream message received:', JSON.stringify(body, null, 2));
        if (body.event === 'connected') {
            this.logger.log('Media stream connected for call:', body.streamSid);
        }
        else if (body.event === 'start') {
            this.logger.log('Media stream started for call:', body.start?.callSid);
        }
        else if (body.event === 'media') {
            const { payload, timestamp, sequenceNumber } = body.media || {};
            this.logger.debug(`Received audio payload: ${payload?.length} bytes, seq: ${sequenceNumber}`);
        }
        else if (body.event === 'stop') {
            this.logger.log('Media stream stopped for call:', body.stop?.callSid);
        }
        return 'OK';
    }
    async handleRecordingCallback(body) {
        this.logger.log('\n🎙️ RECORDING CALLBACK RECEIVED (Legacy - not used with streaming):');
        this.logger.log(JSON.stringify(body, null, 2));
        const { CallSid, RecordingUrl, RecordingDuration } = body;
        const activeCall = this.telephonyService.getActiveCall(CallSid);
        if (activeCall) {
            activeCall.recordingUrl = RecordingUrl;
            activeCall.recordingDuration = RecordingDuration ? parseInt(RecordingDuration) : undefined;
        }
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
    }
    async handleGatherCallback(body) {
        this.logger.log('Gather callback received:', body);
        const { CallSid, Digits, SpeechResult } = body;
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        if (Digits) {
            this.logger.log(`User pressed: ${Digits} for call ${CallSid}`);
            this.telephonyService.handleDTMFReceived(CallSid, Digits);
        }
        if (SpeechResult) {
            this.logger.log(`Speech detected for call ${CallSid}: "${SpeechResult}"`);
            this.telephonyService.handleTranscriptionReceived(CallSid, SpeechResult);
        }
        const activeCall = this.telephonyService.getActiveCall(CallSid);
        const isWaiting = this.isCallInWaitingState(CallSid);
        const isHumanConversation = this.humanConversationCalls.has(CallSid);
        if (isWaiting) {
            console.log(`⏸️  Call in WAITING state - using extended timeout (120s, resets on speech)`);
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="120" speechTimeout="10" input="dtmf speech">
    <Pause length="115"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
        }
        else if (isHumanConversation) {
            console.log(`🗣️  Gather callback: Call in HUMAN CONVERSATION - staying silent`);
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
        }
        else {
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
        }
    }
    isCallInWaitingState(callSid) {
        return this.waitingCalls.has(callSid);
    }
    async handleTranscriptionCallback(body) {
        this.logger.log('\n📝 TWILIO TRANSCRIPTION RECEIVED:');
        this.logger.log(JSON.stringify(body, null, 2));
        const { CallSid, TranscriptionText, TranscriptionStatus } = body;
        if (TranscriptionStatus === 'completed' && TranscriptionText) {
            this.logger.log(`\n🎤 TRANSCRIPTION for call ${CallSid}:`);
            this.logger.log(`   Text: "${TranscriptionText}"`);
            const activeCall = this.telephonyService.getActiveCall(CallSid);
            if (activeCall) {
                if (!activeCall.transcript) {
                    activeCall.transcript = [];
                }
                activeCall.transcript.push({
                    timestamp: new Date(),
                    speaker: 'human',
                    text: TranscriptionText,
                    source: 'twilio-transcription'
                });
            }
            this.telephonyService.handleTranscriptionReceived(CallSid, TranscriptionText);
        }
        return { received: true };
    }
    mapTwilioStatus(twilioStatus) {
        const statusMap = {
            'queued': 'initiating',
            'ringing': 'ringing',
            'in-progress': 'in-progress',
            'completed': 'completed',
            'busy': 'busy',
            'failed': 'failed',
            'no-answer': 'no-answer',
        };
        return statusMap[twilioStatus] || twilioStatus;
    }
};
exports.TelephonyController = TelephonyController;
__decorate([
    (0, common_1.Post)('call'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate an outbound call' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Call initiated successfully',
        schema: {
            properties: {
                callSid: { type: 'string', example: 'CA1234567890abcdef1234567890abcdef' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input data' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Twilio not configured or call failed' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [initiate_call_dto_1.InitiateCallDto]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "initiateCall", null);
__decorate([
    (0, common_1.Delete)('call/:callSid'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'End an active call' }),
    (0, swagger_1.ApiParam)({ name: 'callSid', description: 'Twilio Call SID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Call ended successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Call not found' }),
    __param(0, (0, common_1.Param)('callSid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "endCall", null);
__decorate([
    (0, common_1.Post)('call/:callSid/dtmf'),
    (0, swagger_1.ApiOperation)({ summary: 'Send DTMF tones to an active call' }),
    (0, swagger_1.ApiParam)({ name: 'callSid', description: 'Twilio Call SID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'DTMF sent successfully',
        schema: {
            properties: {
                success: { type: 'boolean', example: true }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Call not found' }),
    __param(0, (0, common_1.Param)('callSid')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_dtmf_dto_1.SendDTMFDto]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "sendDTMF", null);
__decorate([
    (0, common_1.Get)('calls'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active calls' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of active calls',
        isArray: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "getActiveCalls", null);
__decorate([
    (0, common_1.Get)('call/:callSid'),
    (0, swagger_1.ApiOperation)({ summary: 'Get status of a specific call' }),
    (0, swagger_1.ApiParam)({ name: 'callSid', description: 'Twilio Call SID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Call status retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Call not found' }),
    __param(0, (0, common_1.Param)('callSid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "getCallStatus", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Content-Type', 'application/xml'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('webhook/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Content-Type', 'application/json'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "handleStatusCallback", null);
__decorate([
    (0, common_1.Post)('media-stream'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Content-Type', 'text/plain'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "handleMediaStream", null);
__decorate([
    (0, common_1.Post)('webhook/recording'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Content-Type', 'application/xml'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "handleRecordingCallback", null);
__decorate([
    (0, common_1.Post)('webhook/gather'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Content-Type', 'application/xml'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "handleGatherCallback", null);
__decorate([
    (0, common_1.Post)('webhook/transcription'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelephonyController.prototype, "handleTranscriptionCallback", null);
exports.TelephonyController = TelephonyController = TelephonyController_1 = __decorate([
    (0, swagger_1.ApiTags)('telephony'),
    (0, common_1.Controller)('telephony'),
    __metadata("design:paramtypes", [telephony_service_1.TelephonyService,
        event_emitter_1.EventEmitter2])
], TelephonyController);
//# sourceMappingURL=telephony.controller.js.map