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
var DeepgramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepgramService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const sdk_1 = require("@deepgram/sdk");
let DeepgramService = DeepgramService_1 = class DeepgramService {
    constructor(configService, eventEmitter) {
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DeepgramService_1.name);
        this.activeSessions = new Map();
        this.initializeDeepgram();
    }
    initializeDeepgram() {
        const apiKey = this.configService.get('speech.stt.deepgram.apiKey');
        if (!apiKey) {
            this.logger.warn('Deepgram API key not configured. STT will not be available.');
            return;
        }
        try {
            this.deepgramClient = (0, sdk_1.createClient)(apiKey);
            this.logger.log('Deepgram client initialized successfully');
        }
        catch (error) {
            this.logger.error(`Failed to initialize Deepgram: ${error.message}`);
        }
    }
    async startSTTSession(callSid) {
        if (!this.deepgramClient) {
            this.logger.warn('Deepgram not available for STT session');
            return;
        }
        try {
            const dgConnection = this.deepgramClient.listen.live({
                model: 'nova-2-phonecall',
                language: 'en-US',
                smart_format: true,
                punctuate: true,
                diarize: false,
                encoding: 'mulaw',
                sample_rate: 8000,
                channels: 1,
                interim_results: true,
                endpointing: 300,
                vad_events: true,
            });
            dgConnection.addListener(sdk_1.LiveTranscriptionEvents.Open, () => {
                this.logger.log(`Deepgram STT session opened for call ${callSid}`);
            });
            dgConnection.addListener(sdk_1.LiveTranscriptionEvents.Transcript, (data) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                const isFinal = data.is_final;
                const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
                if (transcript && transcript.trim().length > 0) {
                    if (isFinal) {
                        this.logger.log(`\n🔊 DEEPGRAM FINAL TRANSCRIPT:`);
                        this.logger.log(`   Call: ${callSid}`);
                        this.logger.log(`   Text: "${transcript}"`);
                        this.logger.log(`   Confidence: ${(confidence * 100).toFixed(1)}%\n`);
                    }
                    else {
                        this.logger.debug(`   [interim]: "${transcript}"`);
                    }
                    this.eventEmitter.emit('stt.transcript', {
                        callSid,
                        transcript,
                        isFinal,
                        confidence,
                        timestamp: new Date(),
                    });
                    if (isFinal) {
                        this.eventEmitter.emit('stt.final', {
                            callSid,
                            transcript,
                            confidence,
                            timestamp: new Date(),
                        });
                    }
                }
            });
            dgConnection.addListener(sdk_1.LiveTranscriptionEvents.Error, (error) => {
                this.logger.error(`Deepgram error for call ${callSid}:`, error);
            });
            dgConnection.addListener(sdk_1.LiveTranscriptionEvents.Close, () => {
                this.logger.log(`Deepgram STT session closed for call ${callSid}`);
            });
            this.activeSessions.set(callSid, {
                connection: dgConnection,
                startTime: new Date(),
                audioChunks: 0,
            });
            this.logger.log(`STT session started for call ${callSid}`);
        }
        catch (error) {
            this.logger.error(`Failed to start STT session for call ${callSid}: ${error.message}`);
        }
    }
    processAudioChunk(callSid, audioData) {
        const session = this.activeSessions.get(callSid);
        if (!session) {
            this.logger.warn(`No STT session found for call ${callSid}`);
            return;
        }
        try {
            if (session.connection && session.connection.getReadyState() === 1) {
                session.connection.send(audioData);
                session.audioChunks++;
            }
        }
        catch (error) {
            this.logger.error(`Error sending audio to Deepgram for call ${callSid}: ${error.message}`);
        }
    }
    async stopSTTSession(callSid) {
        const session = this.activeSessions.get(callSid);
        if (!session) {
            return;
        }
        try {
            if (session.connection) {
                session.connection.finish();
            }
            this.logger.log(`Stopped STT session for call ${callSid}. Processed ${session.audioChunks} audio chunks.`);
            this.activeSessions.delete(callSid);
        }
        catch (error) {
            this.logger.error(`Error stopping STT session for call ${callSid}: ${error.message}`);
        }
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.keys());
    }
    getSessionInfo(callSid) {
        return this.activeSessions.get(callSid);
    }
    isAvailable() {
        return this.deepgramClient !== null;
    }
};
exports.DeepgramService = DeepgramService;
exports.DeepgramService = DeepgramService = DeepgramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        event_emitter_1.EventEmitter2])
], DeepgramService);
//# sourceMappingURL=deepgram.service.js.map