import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/call-events',
})
@Injectable()
export class CallWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('CallWebSocketGateway');
  private activeStreams = new Map<string, Socket>();
  private callSubscribers = new Map<string, Set<string>>();

  afterInit(server: Server) {
    this.logger.log('Call WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection-established', { clientId: client.id });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.activeStreams.delete(client.id);
    
    // Clean up call subscriptions
    this.callSubscribers.forEach((subscribers, callSid) => {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.callSubscribers.delete(callSid);
      }
    });
  }

  @SubscribeMessage('audio-stream')
  handleAudioStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { callSid, audio, sequenceNumber } = payload;
    
    this.logger.debug(`Received audio chunk for call ${callSid}, sequence: ${sequenceNumber}`);
    
    // Emit to speech-to-text service subscribers
    this.server.to(`call-${callSid}`).emit('audio-chunk', {
      callSid,
      audio,
      sequenceNumber,
      timestamp: new Date(),
    });
    
    // Also emit to general audio processing subscribers
    this.server.emit('audio-processing', {
      callSid,
      audio,
      sequenceNumber,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('subscribe-to-call')
  handleSubscribeToCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callSid: string },
  ) {
    const { callSid } = data;
    
    client.join(`call-${callSid}`);
    
    // Track subscribers for this call
    if (!this.callSubscribers.has(callSid)) {
      this.callSubscribers.set(callSid, new Set());
    }
    this.callSubscribers.get(callSid)!.add(client.id);
    
    this.logger.log(`Client ${client.id} subscribed to call: ${callSid}`);
    client.emit('call-subscription-confirmed', { callSid });
  }

  @SubscribeMessage('unsubscribe-from-call')
  handleUnsubscribeFromCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callSid: string },
  ) {
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

  @SubscribeMessage('register-call-stream')
  handleRegisterCallStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callSid: string },
  ) {
    const { callSid } = data;
    
    this.activeStreams.set(callSid, client);
    client.join(`call-${callSid}`);
    
    this.logger.log(`Registered audio stream for call: ${callSid}`);
    client.emit('stream-registration-confirmed', { callSid });
  }

  // Event listeners for telephony events
  @OnEvent('call.initiated')
  handleCallInitiated(data: any) {
    this.logger.log('Call initiated event received:', data);
    this.server.emit('call-initiated', data);
  }

  @OnEvent('call.ended')
  handleCallEnded(data: any) {
    this.logger.log('Call ended event received:', data);
    this.server.emit('call-ended', data);
    
    // Clean up streams for this call
    if (this.activeStreams.has(data.callSid)) {
      this.activeStreams.delete(data.callSid);
    }
    
    // Notify subscribers
    this.server.to(`call-${data.callSid}`).emit('call-terminated', data);
  }

  @OnEvent('dtmf.sent')
  handleDTMFSent(data: any) {
    this.logger.log('DTMF sent event received:', data);
    this.server.to(`call-${data.callSid}`).emit('dtmf-sent', data);
  }

  @OnEvent('dtmf.received')
  handleDTMFReceived(data: any) {
    this.logger.log('DTMF received event:', data);
    this.server.to(`call-${data.callSid}`).emit('dtmf-received', data);
  }

  @OnEvent('call.status-updated')
  handleCallStatusUpdated(data: any) {
    this.logger.log('Call status updated event:', data);
    this.server.to(`call-${data.callSid}`).emit('call-status-updated', data);
  }

  // Public methods for service integration
  sendAudioToCall(callSid: string, audioData: Buffer) {
    const client = this.activeStreams.get(callSid);
    if (client) {
      client.emit('play-audio', { 
        audio: audioData,
        timestamp: new Date(),
      });
    } else {
      this.logger.warn(`No active stream found for call: ${callSid}`);
    }
  }

  broadcastCallEvent(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  sendCallSpecificEvent(callSid: string, event: string, data: any) {
    this.server.to(`call-${callSid}`).emit(event, {
      callSid,
      ...data,
      timestamp: new Date(),
    });
  }

  getActiveCallsCount(): number {
    return this.activeStreams.size;
  }

  getSubscribersForCall(callSid: string): number {
    return this.callSubscribers.get(callSid)?.size || 0;
  }
}