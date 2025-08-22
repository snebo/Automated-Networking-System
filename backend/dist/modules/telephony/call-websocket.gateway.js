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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallWebSocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const event_emitter_1 = require("@nestjs/event-emitter");
let CallWebSocketGateway = class CallWebSocketGateway {
    constructor() {
        this.logger = new common_1.Logger('CallWebSocketGateway');
        this.activeStreams = new Map();
        this.callSubscribers = new Map();
    }
    afterInit(server) {
        this.logger.log('Call WebSocket Gateway initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        client.emit('connection-established', { clientId: client.id });
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.activeStreams.delete(client.id);
        this.callSubscribers.forEach((subscribers, callSid) => {
            subscribers.delete(client.id);
            if (subscribers.size === 0) {
                this.callSubscribers.delete(callSid);
            }
        });
    }
    handleAudioStream(client, payload) {
        const { callSid, audio, sequenceNumber } = payload;
        this.logger.debug(`Received audio chunk for call ${callSid}, sequence: ${sequenceNumber}`);
        this.server.to(`call-${callSid}`).emit('audio-chunk', {
            callSid,
            audio,
            sequenceNumber,
            timestamp: new Date(),
        });
        this.server.emit('audio-processing', {
            callSid,
            audio,
            sequenceNumber,
            timestamp: new Date(),
        });
    }
    handleSubscribeToCall(client, data) {
        const { callSid } = data;
        client.join(`call-${callSid}`);
        if (!this.callSubscribers.has(callSid)) {
            this.callSubscribers.set(callSid, new Set());
        }
        this.callSubscribers.get(callSid).add(client.id);
        this.logger.log(`Client ${client.id} subscribed to call: ${callSid}`);
        client.emit('call-subscription-confirmed', { callSid });
    }
    handleUnsubscribeFromCall(client, data) {
        const { callSid } = data;
        client.leave(`call-${callSid}`);
        const subscribers = this.callSubscribers.get(callSid);
        if (subscribers) {
            subscribers.delete(client.id);
            if (subscribers.size === 0) {
                this.callSubscribers.delete(callSid);
            }
        }
        this.logger.log(`Client ${client.id} unsubscribed from call: ${callSid}`);
        client.emit('call-unsubscription-confirmed', { callSid });
    }
    handleRegisterCallStream(client, data) {
        const { callSid } = data;
        this.activeStreams.set(callSid, client);
        client.join(`call-${callSid}`);
        this.logger.log(`Registered audio stream for call: ${callSid}`);
        client.emit('stream-registration-confirmed', { callSid });
    }
    handleCallInitiated(data) {
        this.logger.log('Call initiated event received:', data);
        this.server.emit('call-initiated', data);
    }
    handleCallEnded(data) {
        this.logger.log('Call ended event received:', data);
        this.server.emit('call-ended', data);
        if (this.activeStreams.has(data.callSid)) {
            this.activeStreams.delete(data.callSid);
        }
        this.server.to(`call-${data.callSid}`).emit('call-terminated', data);
    }
    handleDTMFSent(data) {
        this.logger.log('DTMF sent event received:', data);
        this.server.to(`call-${data.callSid}`).emit('dtmf-sent', data);
    }
    handleDTMFReceived(data) {
        this.logger.log('DTMF received event:', data);
        this.server.to(`call-${data.callSid}`).emit('dtmf-received', data);
    }
    handleCallStatusUpdated(data) {
        this.logger.log('Call status updated event:', data);
        this.server.to(`call-${data.callSid}`).emit('call-status-updated', data);
    }
    sendAudioToCall(callSid, audioData) {
        const client = this.activeStreams.get(callSid);
        if (client) {
            client.emit('play-audio', {
                audio: audioData,
                timestamp: new Date(),
            });
        }
        else {
            this.logger.warn(`No active stream found for call: ${callSid}`);
        }
    }
    broadcastCallEvent(event, data) {
        this.server.emit(event, {
            ...data,
            timestamp: new Date(),
        });
    }
    sendCallSpecificEvent(callSid, event, data) {
        this.server.to(`call-${callSid}`).emit(event, {
            callSid,
            ...data,
            timestamp: new Date(),
        });
    }
    getActiveCallsCount() {
        return this.activeStreams.size;
    }
    getSubscribersForCall(callSid) {
        return this.callSubscribers.get(callSid)?.size || 0;
    }
};
exports.CallWebSocketGateway = CallWebSocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CallWebSocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('audio-stream'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleAudioStream", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe-to-call'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleSubscribeToCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe-from-call'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleUnsubscribeFromCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('register-call-stream'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleRegisterCallStream", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.initiated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleCallInitiated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.ended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleCallEnded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('dtmf.sent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleDTMFSent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('dtmf.received'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleDTMFReceived", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.status-updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CallWebSocketGateway.prototype, "handleCallStatusUpdated", null);
exports.CallWebSocketGateway = CallWebSocketGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/call-events',
    }),
    (0, common_1.Injectable)()
], CallWebSocketGateway);
//# sourceMappingURL=call-websocket.gateway.js.map