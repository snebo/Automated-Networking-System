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
var TTSHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTSHandlerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const openai_tts_service_1 = require("./openai-tts.service");
const twilio_service_1 = require("../../telephony/twilio.service");
const config_1 = require("@nestjs/config");
let TTSHandlerService = TTSHandlerService_1 = class TTSHandlerService {
    constructor(openaiTTS, twilioService, configService, eventEmitter) {
        this.openaiTTS = openaiTTS;
        this.twilioService = twilioService;
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(TTSHandlerService_1.name);
        this.activeSessions = new Map();
    }
    async handleGenerateRequest(event) {
        await this.handleSpeakRequest(event);
    }
    async handleSpeakRequest(event) {
        try {
            const request = {
                callSid: event.callSid,
                text: event.text,
                priority: event.priority || 'medium',
                voice: event.voice,
                context: event.context,
                timestamp: new Date(),
            };
            this.logger.log(`🗣️ TTS REQUEST for call ${event.callSid}: "${event.text.substring(0, 50)}..."`);
            await this.queueTTSRequest(request);
        }
        catch (error) {
            this.logger.error(`TTS handler error: ${error.message}`, error.stack);
        }
    }
    async queueTTSRequest(request) {
        let session = this.activeSessions.get(request.callSid);
        if (!session) {
            session = {
                callSid: request.callSid,
                isPlaying: false,
                queuedRequests: [],
            };
            this.activeSessions.set(request.callSid, session);
        }
        if (request.priority === 'high') {
            session.queuedRequests.unshift(request);
        }
        else {
            session.queuedRequests.push(request);
        }
        if (!session.isPlaying) {
            await this.processNextTTSRequest(session);
        }
    }
    async processNextTTSRequest(session) {
        if (session.queuedRequests.length === 0) {
            return;
        }
        session.isPlaying = true;
        session.currentRequest = session.queuedRequests.shift();
        if (!session.currentRequest) {
            session.isPlaying = false;
            return;
        }
        const request = session.currentRequest;
        try {
            this.logger.log(`🎵 SPEAKING TEXT DIRECTLY via TwiML for call ${request.callSid}:`);
            this.logger.log(`   Text: "${request.text}"`);
            await this.playAudioOnCall(request.callSid, Buffer.from(''), request.text);
            this.logger.log(`🔊 Speech playback completed for call ${request.callSid}`);
            this.eventEmitter.emit('tts.completed', {
                callSid: request.callSid,
                context: request.context || 'general',
                timestamp: new Date(),
            });
        }
        catch (error) {
            this.logger.error(`Failed to generate/play speech for call ${request.callSid}: ${error.message}`);
        }
        await this.finishCurrentRequest(session);
    }
    async playAudioOnCall(callSid, audioBuffer, text) {
        try {
            this.logger.log(`🔊 PLAYING AUDIO on call ${callSid} (${audioBuffer.length} bytes)`);
            const baseUrl = this.configService.get('app.url') || process.env.APP_URL || 'http://localhost:3000';
            const speechTwiML = `<Response>
        <Say voice="alice">${this.escapeForTwiML(text)}</Say>
        <Redirect>${baseUrl}/telephony/webhook</Redirect>
      </Response>`;
            await this.twilioService.updateCallWithTwiML(callSid, speechTwiML);
        }
        catch (error) {
            this.logger.error(`Failed to play audio on call ${callSid}: ${error.message}`);
            throw error;
        }
    }
    escapeForTwiML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    async finishCurrentRequest(session) {
        session.isPlaying = false;
        session.currentRequest = undefined;
        if (session.queuedRequests.length > 0) {
            await this.processNextTTSRequest(session);
        }
    }
    handleCallEnded(event) {
        const session = this.activeSessions.get(event.callSid);
        if (session) {
            this.logger.log(`Cleaning up TTS session for ended call ${event.callSid}`);
            this.activeSessions.delete(event.callSid);
        }
    }
    handleInterrupt(event) {
        const session = this.activeSessions.get(event.callSid);
        if (session) {
            this.logger.log(`Interrupting TTS for call ${event.callSid}`);
            session.queuedRequests = [];
        }
    }
    isTTSActive(callSid) {
        const session = this.activeSessions.get(callSid);
        return session ? session.isPlaying : false;
    }
    getTTSStatus(callSid) {
        const session = this.activeSessions.get(callSid);
        if (!session) {
            return {
                isPlaying: false,
                queueLength: 0,
            };
        }
        return {
            isPlaying: session.isPlaying,
            queueLength: session.queuedRequests.length,
            currentText: session.currentRequest?.text,
        };
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.keys());
    }
};
exports.TTSHandlerService = TTSHandlerService;
__decorate([
    (0, event_emitter_1.OnEvent)('tts.generate'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TTSHandlerService.prototype, "handleGenerateRequest", null);
__decorate([
    (0, event_emitter_1.OnEvent)('tts.speak'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TTSHandlerService.prototype, "handleSpeakRequest", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.ended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TTSHandlerService.prototype, "handleCallEnded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('tts.interrupt'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TTSHandlerService.prototype, "handleInterrupt", null);
exports.TTSHandlerService = TTSHandlerService = TTSHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_tts_service_1.OpenAITTSService,
        twilio_service_1.TwilioService,
        config_1.ConfigService,
        event_emitter_1.EventEmitter2])
], TTSHandlerService);
//# sourceMappingURL=tts-handler.service.js.map