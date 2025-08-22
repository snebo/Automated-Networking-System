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
var AudioStreamGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioStreamGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const speech_processor_service_1 = require("./speech-processor.service");
const deepgram_service_1 = require("./services/deepgram.service");
let AudioStreamGateway = AudioStreamGateway_1 = class AudioStreamGateway {
    constructor(speechProcessor, deepgramService) {
        this.speechProcessor = speechProcessor;
        this.deepgramService = deepgramService;
        this.logger = new common_1.Logger(AudioStreamGateway_1.name);
        this.twilioConnections = new Map();
    }
    afterInit() {
        this.logger.log('Audio Stream WebSocket Gateway initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        for (const [callSid, connection] of this.twilioConnections.entries()) {
            if (connection.socketId === client.id) {
                this.speechProcessor.stopAudioStream(callSid);
                this.twilioConnections.delete(callSid);
                break;
            }
        }
    }
    handleTwilioConnected(client, payload) {
        this.logger.log('Twilio Media Stream connected:', payload);
        const { streamSid, callSid } = payload;
        this.twilioConnections.set(callSid, {
            streamSid,
            socketId: client.id,
            connected: true,
            startTime: new Date(),
        });
        this.speechProcessor.startAudioStream(callSid, streamSid);
        this.deepgramService.startSTTSession(callSid);
    }
    handleStreamStart(client, payload) {
        this.logger.log('Media stream started:', payload);
    }
    handleMedia(client, payload) {
        const { streamSid, payload: mediaPayload } = payload;
        let callSid = null;
        for (const [cSid, connection] of this.twilioConnections.entries()) {
            if (connection.streamSid === streamSid && connection.socketId === client.id) {
                callSid = cSid;
                break;
            }
        }
        if (!callSid) {
            this.logger.warn(`No call SID found for stream ${streamSid}`);
            return;
        }
        const audioData = Buffer.from(mediaPayload, 'base64');
        this.speechProcessor.processAudioChunk(callSid, audioData);
        this.deepgramService.processAudioChunk(callSid, audioData);
    }
    handleStreamStop(client, payload) {
        this.logger.log('Media stream stopped:', payload);
        const { streamSid } = payload;
        for (const [callSid, connection] of this.twilioConnections.entries()) {
            if (connection.streamSid === streamSid && connection.socketId === client.id) {
                this.speechProcessor.stopAudioStream(callSid);
                this.deepgramService.stopSTTSession(callSid);
                this.twilioConnections.delete(callSid);
                break;
            }
        }
    }
    sendAudioToTwilio(callSid, audioData) {
        const connection = this.twilioConnections.get(callSid);
        if (connection) {
            const client = this.server.sockets.sockets.get(connection.socketId);
            if (client) {
                client.emit('media', {
                    streamSid: connection.streamSid,
                    payload: audioData.toString('base64'),
                });
            }
        }
    }
    getTwilioConnections() {
        return Array.from(this.twilioConnections.entries()).map(([callSid, connection]) => ({
            callSid,
            streamSid: connection.streamSid,
            connected: connection.connected,
            startTime: connection.startTime,
        }));
    }
};
exports.AudioStreamGateway = AudioStreamGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AudioStreamGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('connected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AudioStreamGateway.prototype, "handleTwilioConnected", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('start'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AudioStreamGateway.prototype, "handleStreamStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('media'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AudioStreamGateway.prototype, "handleMedia", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('stop'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AudioStreamGateway.prototype, "handleStreamStop", null);
exports.AudioStreamGateway = AudioStreamGateway = AudioStreamGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/media-stream',
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [speech_processor_service_1.SpeechProcessorService,
        deepgram_service_1.DeepgramService])
], AudioStreamGateway);
//# sourceMappingURL=audio-stream.gateway.js.map