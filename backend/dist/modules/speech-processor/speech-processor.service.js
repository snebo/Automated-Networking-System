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
var SpeechProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechProcessorService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
let SpeechProcessorService = SpeechProcessorService_1 = class SpeechProcessorService {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SpeechProcessorService_1.name);
        this.activeStreams = new Map();
    }
    startAudioStream(callSid, streamSid) {
        this.logger.log(`Starting audio stream for call ${callSid}, stream ${streamSid}`);
        this.activeStreams.set(callSid, {
            streamSid,
            startTime: new Date(),
            audioChunks: [],
            transcriptBuffer: '',
        });
        this.eventEmitter.emit('stream.started', { callSid, streamSid });
    }
    processAudioChunk(callSid, audioData) {
        const stream = this.activeStreams.get(callSid);
        if (!stream) {
            this.logger.warn(`No active stream found for call ${callSid}`);
            return;
        }
        stream.audioChunks.push({
            timestamp: new Date(),
            data: audioData,
        });
        this.eventEmitter.emit('audio.chunk', {
            callSid,
            audioData,
            timestamp: new Date(),
        });
    }
    stopAudioStream(callSid) {
        const stream = this.activeStreams.get(callSid);
        if (stream) {
            this.logger.log(`Stopping audio stream for call ${callSid}`);
            this.eventEmitter.emit('stream.stopped', {
                callSid,
                streamSid: stream.streamSid,
                duration: Date.now() - stream.startTime.getTime(),
                totalChunks: stream.audioChunks.length,
            });
            this.activeStreams.delete(callSid);
        }
    }
    getActiveStreams() {
        return Array.from(this.activeStreams.keys());
    }
    getStreamInfo(callSid) {
        return this.activeStreams.get(callSid);
    }
};
exports.SpeechProcessorService = SpeechProcessorService;
exports.SpeechProcessorService = SpeechProcessorService = SpeechProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], SpeechProcessorService);
//# sourceMappingURL=speech-processor.service.js.map